import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DailyReport } from '../entities/daily-report.entity';
import { LearningArea } from '../entities/learning-area.entity';
import { ETrend } from '../enums/snapshot.enum';

// ── Internal DTOs (never exposed via HTTP) ───────────────────────────────────

export interface ActivityAggregation {
  activityPkid: number;
  activityId: string;
  activityName: string;
  gradingType: string;
  /** Primary learning area — first one found, or null if uncategorised. */
  learningAreaPkid: number | null;
  learningAreaId: string | null;
  learningAreaName: string | null;
  observationCount: number;
  averageScore: number | null;
  firstScore: number | null;
  lastScore: number | null;
  trend: ETrend | null;
  latestRawValue: string;
  /** All chronological normalised scores for this activity (for trend calc). */
  scores: number[];
}

// ── Service ──────────────────────────────────────────────────────────────────

/**
 * AggregationService — Phase 3.
 *
 * Pure computation — does not write to the database.
 * Called by ReportSnapshotService when generating snapshots.
 *
 * Key responsibilities:
 *   1. Fetch daily_reports for a student + period.
 *   2. Resolve each activity's primary learning area.
 *   3. Group by activity and compute per-activity statistics.
 *   4. Compute the overall (cross-activity) score and trend.
 *   5. Expose helpers used by the scheduler for admin summaries.
 */
@Injectable()
export class AggregationService {
  private readonly logger = new Logger(AggregationService.name);

  constructor(
    @InjectRepository(DailyReport)
    private readonly reportRepository: Repository<DailyReport>,
    @InjectRepository(LearningArea)
    private readonly learningAreaRepository: Repository<LearningArea>,
  ) {}

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Fetch and aggregate all daily observations for one student in a date range.
   * Returns per-activity aggregations ordered by learning area name, then
   * activity name — matching the layout parents see in the mobile app.
   */
  async aggregateStudentPeriod(
    studentPkid: number,
    schoolPkid: number,
    from: string,
    to: string,
  ): Promise<ActivityAggregation[]> {
    // Single query: all observations in period, ordered chronologically so
    // firstScore / lastScore / trend are computed in the right sequence.
    const reports = await this.reportRepository
      .createQueryBuilder('dr')
      .innerJoinAndSelect('dr.activity', 'activity')
      .where('dr.school_id = :schoolPkid', { schoolPkid })
      .andWhere('dr.student_id = :studentPkid', { studentPkid })
      .andWhere('dr.date >= :from', { from })
      .andWhere('dr.date <= :to', { to })
      .orderBy('dr.date', 'ASC')
      .addOrderBy('dr.createdAt', 'ASC')
      .getMany();

    if (!reports.length) return [];

    // Resolve learning areas for all activities in a single query.
    const activityPkids = [
      ...new Set(reports.map((r) => r.activity.pkid)),
    ];
    const learningAreaMap = await this.resolvePrimaryLearningAreas(
      activityPkids,
      schoolPkid,
    );

    // Group reports by activity.
    const byActivity = new Map<number, DailyReport[]>();
    for (const report of reports) {
      const key = report.activity.pkid;
      const bucket = byActivity.get(key) ?? [];
      bucket.push(report);
      byActivity.set(key, bucket);
    }

    const aggregations: ActivityAggregation[] = [];

    for (const [activityPkid, activityReports] of byActivity) {
      const { activity } = activityReports[0];
      const scores = activityReports
        .map((r) => this.coerceDecimal(r.normalisedScore))
        .filter((s): s is number => s !== null);

      const la = learningAreaMap.get(activityPkid) ?? null;

      aggregations.push({
        activityPkid,
        activityId: activity.id,
        activityName: activity.name,
        gradingType: activity.gradingType,
        learningAreaPkid: la?.pkid ?? null,
        learningAreaId: la?.id ?? null,
        learningAreaName: la?.name ?? null,
        observationCount: activityReports.length,
        averageScore: this.avg(scores),
        firstScore: scores[0] ?? null,
        lastScore: scores[scores.length - 1] ?? null,
        trend: this.computeTrend(scores),
        latestRawValue:
          activityReports[activityReports.length - 1].rawValue,
        scores,
      });
    }

    // Sort: by learning-area name (nulls last), then activity name.
    aggregations.sort((a, b) => {
      const la = (a.learningAreaName ?? 'zzz').localeCompare(
        b.learningAreaName ?? 'zzz',
      );
      return la !== 0 ? la : a.activityName.localeCompare(b.activityName);
    });

    return aggregations;
  }

  /**
   * Compute the overall normalised score across all activity aggregations.
   * Simple mean of per-activity average scores (each activity is weighted
   * equally — suitable for daycare where activities are of similar importance).
   */
  computeOverallScore(aggregations: ActivityAggregation[]): number | null {
    const scores = aggregations
      .map((a) => a.averageScore)
      .filter((s): s is number => s !== null);
    return this.avg(scores);
  }

  /**
   * Compute the student's overall trend by majority-vote across activity trends.
   * Ties resolve to STABLE.
   */
  computeOverallTrend(aggregations: ActivityAggregation[]): ETrend | null {
    const trends = aggregations
      .map((a) => a.trend)
      .filter((t): t is ETrend => t !== null);
    if (!trends.length) return null;

    const improving = trends.filter((t) => t === ETrend.IMPROVING).length;
    const declining = trends.filter((t) => t === ETrend.DECLINING).length;

    if (improving > declining) return ETrend.IMPROVING;
    if (declining > improving) return ETrend.DECLINING;
    return ETrend.STABLE;
  }

  /**
   * Trend for a single activity: compare the average of the first half of
   * chronological scores against the average of the second half.
   *
   * Threshold: ±5 points on the 0–100 normalised scale.
   * Requires ≥2 data points; returns null otherwise.
   */
  computeTrend(scores: number[]): ETrend | null {
    if (scores.length < 2) return null;

    const mid = Math.floor(scores.length / 2);
    const firstHalf = scores.slice(0, mid);
    const secondHalf = scores.slice(mid);

    const firstAvg = this.avg(firstHalf)!;
    const secondAvg = this.avg(secondHalf)!;
    const delta = secondAvg - firstAvg;

    if (delta >= 5) return ETrend.IMPROVING;
    if (delta <= -5) return ETrend.DECLINING;
    return ETrend.STABLE;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * For each activity pkid, find its first learning area (alphabetical by name)
   * that belongs to the same school.
   *
   * Uses a single JOIN query rather than N per-activity lookups.
   */
  private async resolvePrimaryLearningAreas(
    activityPkids: number[],
    schoolPkid: number,
  ): Promise<Map<number, LearningArea>> {
    if (!activityPkids.length) return new Map();

    // Join through the learning_area_activities pivot table.
    // We only need the first learning area per activity (ORDER BY la.name).
    const rows: { activity_pkid: number; la_pkid: number; la_id: string; la_name: string }[] =
      await this.learningAreaRepository
        .createQueryBuilder('la')
        .select('a.pkid', 'activity_pkid')
        .addSelect('la.pkid', 'la_pkid')
        .addSelect('la.id', 'la_id')
        .addSelect('la.name', 'la_name')
        .innerJoin('la.activities', 'a')
        .where('a.pkid IN (:...pkids)', { pkids: activityPkids })
        .andWhere('la.school_id = :schoolPkid', { schoolPkid })
        .orderBy('la.name', 'ASC')
        .getRawMany();

    // Keep only the first row per activity (ORDER BY la.name already applied).
    const result = new Map<number, LearningArea>();
    for (const row of rows) {
      if (!result.has(row.activity_pkid)) {
        // Build a minimal LearningArea-like object — only name/pkid/id needed.
        const la = new LearningArea();
        la.pkid = row.la_pkid;
        la.id = row.la_id;
        la.name = row.la_name;
        result.set(row.activity_pkid, la);
      }
    }
    return result;
  }

  private avg(values: number[]): number | null {
    if (!values.length) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private coerceDecimal(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    const n = parseFloat(value as string);
    return isFinite(n) ? n : null;
  }
}
