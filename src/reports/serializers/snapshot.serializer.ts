import { Expose, Transform, Type } from 'class-transformer';
import { BaseSerializer } from 'src/common/serializers';
import { EPerformanceBand, ETrend, scoreToBand } from '../enums/snapshot.enum';

// ── Primitive helpers ─────────────────────────────────────────────────────────

/** Coerce Postgres DECIMAL string → number, or return null. */
function parseDecimal(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = parseFloat(value as string);
  return isFinite(n) ? n : null;
}

// ── Activity item ─────────────────────────────────────────────────────────────

export class SnapshotActivityItemSerializer extends BaseSerializer {
  // id is already @Expose() in BaseSerializer — no re-declaration needed.

  // Activity details (flattened from nested relation)
  @Expose()
  @Transform(({ obj }) => (obj.activity?.id ?? null) as string | null)
  activityId: string;

  @Expose()
  @Transform(({ obj }) => (obj.activity?.name ?? null) as string | null)
  activityName: string;

  @Expose()
  @Transform(({ obj }) => (obj.activity?.gradingType ?? null) as string | null)
  gradingType: string;

  // Learning area (denormalised — survives curriculum changes)
  @Expose()
  @Transform(({ obj }) => (obj.learningAreaName ?? null) as string | null)
  learningAreaName: string;

  // Aggregated figures
  @Expose()
  observationCount: number;

  @Expose()
  @Transform(({ value }) => parseDecimal(value))
  averageScore: number | null;

  @Expose()
  @Transform(({ value }) => parseDecimal(value))
  firstScore: number | null;

  @Expose()
  @Transform(({ value }) => parseDecimal(value))
  lastScore: number | null;

  @Expose()
  trend: ETrend | null;

  @Expose()
  latestRawValue: string | null;

  /** Performance band derived from averageScore — readable label for parent UI. */
  @Expose()
  @Transform(({ obj }) => scoreToBand(parseDecimal(obj.averageScore)))
  performanceBand: EPerformanceBand | null;
}

// ── Learning-area rollup (computed, not stored) ───────────────────────────────

/**
 * Aggregated view of one learning area across all its activities in the
 * snapshot. Computed at serialization time from SnapshotActivityItem rows.
 */
export class LearningAreaRollupSerializer {
  learningAreaName: string;
  activityCount: number;
  totalObservations: number;
  averageScore: number | null;
  trend: ETrend | null;
  performanceBand: EPerformanceBand | null;
}

// ── Main snapshot serializer ──────────────────────────────────────────────────

export class ReportSnapshotSerializer extends BaseSerializer {
  // id is already @Expose() in BaseSerializer.

  // Student (brief projection)
  @Expose()
  @Transform(({ obj }) => (obj.student?.id ?? null) as string | null)
  studentId: string;

  @Expose()
  @Transform(({ obj }) => (obj.student?.fullName ?? null) as string | null)
  studentName: string;

  // Period
  @Expose()
  type: string;

  @Expose()
  periodStart: Date;

  @Expose()
  periodEnd: Date;

  // Headline figures
  @Expose()
  totalObservations: number;

  @Expose()
  @Transform(({ value }) => parseDecimal(value))
  overallScore: number | null;

  @Expose()
  trend: ETrend | null;

  @Expose()
  @Transform(({ obj }) => scoreToBand(parseDecimal(obj.overallScore)))
  performanceBand: EPerformanceBand | null;

  // Workflow
  @Expose()
  status: string;

  @Expose()
  teacherNotes: string | null;

  @Expose()
  reviewedAt: Date | null;

  @Expose()
  publishedAt: Date | null;

  @Expose()
  sentAt: Date | null;

  // Activity breakdown
  @Expose()
  @Type(() => SnapshotActivityItemSerializer)
  activityItems: SnapshotActivityItemSerializer[];

  /**
   * Learning-area rollup — derived from activityItems at serialization time.
   * Groups activity items by learningAreaName and aggregates.
   */
  @Expose()
  @Transform(({ obj }) => computeLearningAreaRollups(obj.activityItems ?? []))
  learningAreaRollups: LearningAreaRollupSerializer[];

  /**
   * Whether the calling parent has opened this report.
   * Always false for staff callers (not meaningful in that context).
   */
  @Expose()
  isRead: boolean;

  // BaseSerializer has createdAt/@Exclude and updatedAt/@Exclude.
  // We want these exposed on snapshots so the client knows when the report
  // was auto-generated and last updated.
  @Expose()
  declare createdAt: Date;

  @Expose()
  declare updatedAt: Date;
}

// ── Bulk generation result ────────────────────────────────────────────────────

export class BulkSnapshotResultSerializer {
  generated: number;
  skipped: number;
  failed: number;
  errors: { studentId: string; reason: string }[];
}

// ── Time-series trends (development dashboard) ───────────────────────────────

/** One data-point in the parent development dashboard trend chart. */
export class TrendLearningAreaSerializer {
  learningAreaName: string;
  averageScore: number | null;
  observationCount: number;
  performanceBand: EPerformanceBand | null;
}

export class StudentTrendPeriodSerializer {
  periodStart: Date;
  periodEnd: Date;
  type: string;
  overallScore: number | null;
  trend: ETrend | null;
  performanceBand: EPerformanceBand | null;
  totalObservations: number;
  byLearningArea: TrendLearningAreaSerializer[];
}

// ── Admin weekly summary (UC4 — operational view) ────────────────────────────

export class ActivityBreakdownSerializer {
  activityId: string;
  activityName: string;
  learningAreaName: string | null;
  observationCount: number;
  averageScore: number | null;
  performanceBand: EPerformanceBand | null;
}

export class LearningAreaBreakdownSerializer {
  learningAreaName: string;
  observationCount: number;
  averageScore: number | null;
  performanceBand: EPerformanceBand | null;
}

export class StudentCoverageSerializer {
  studentId: string;
  studentName: string;
  observationCount: number;
}

export class AdminWeeklySummarySerializer {
  period: { from: string; to: string };
  totalObservations: number;
  activeStudents: number;
  totalStudents: number;
  /** Percentage of enrolled students with ≥1 observation this period. */
  coveragePercent: number;
  /** Students with zero observations — flagged for teacher follow-up. */
  studentsWithNoActivity: StudentCoverageSerializer[];
  byLearningArea: LearningAreaBreakdownSerializer[];
  byActivity: ActivityBreakdownSerializer[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function avg(values: number[]): number | null {
  if (!values.length) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function computeLearningAreaRollups(
  items: SnapshotActivityItemSerializer[],
): LearningAreaRollupSerializer[] {
  if (!items?.length) return [];

  const byArea = new Map<string, SnapshotActivityItemSerializer[]>();

  for (const item of items) {
    const key = item.learningAreaName ?? 'Uncategorised';
    const bucket = byArea.get(key) ?? [];
    bucket.push(item);
    byArea.set(key, bucket);
  }

  return Array.from(byArea.entries()).map(([name, areaItems]) => {
    const scores = areaItems
      .map((i) => parseDecimal(i.averageScore))
      .filter((s): s is number => s !== null);

    const areaAvg = avg(scores);

    // Area trend: majority-vote across activity trends
    const trends = areaItems
      .map((i) => i.trend)
      .filter((t): t is ETrend => t !== null);
    const improving = trends.filter((t) => t === ETrend.IMPROVING).length;
    const declining = trends.filter((t) => t === ETrend.DECLINING).length;
    let trend: ETrend | null = null;
    if (trends.length) {
      if (improving > declining) trend = ETrend.IMPROVING;
      else if (declining > improving) trend = ETrend.DECLINING;
      else trend = ETrend.STABLE;
    }

    return {
      learningAreaName: name,
      activityCount: areaItems.length,
      totalObservations: areaItems.reduce(
        (sum, i) => sum + (i.observationCount ?? 0),
        0,
      ),
      averageScore: areaAvg,
      trend,
      performanceBand: scoreToBand(areaAvg),
    } satisfies LearningAreaRollupSerializer;
  });
}
