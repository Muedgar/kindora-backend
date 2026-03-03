import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Parent } from 'src/parents/entities/parent.entity';
import { StudentTrendsFilterDto } from 'src/reports/dto/snapshot.dto';
import { ReportSnapshot } from 'src/reports/entities/report-snapshot.entity';
import { SnapshotActivityItem } from 'src/reports/entities/snapshot-activity-item.entity';
import { ESnapshotStatus, ETrend } from 'src/reports/enums/snapshot.enum';
import { School } from 'src/schools/entities/school.entity';
import { User } from 'src/users/entities';
import { Repository } from 'typeorm';
import { ParentDashboardResponseDto } from '../dto/parent-dashboard-response.dto';
import { DashboardCacheService } from './dashboard-cache.service';

@Injectable()
export class ParentDashboardService {
  constructor(
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
    @InjectRepository(ReportSnapshot)
    private readonly snapshotRepository: Repository<ReportSnapshot>,
    @InjectRepository(SnapshotActivityItem)
    private readonly itemRepository: Repository<SnapshotActivityItem>,
    private readonly cache: DashboardCacheService,
  ) {}

  async getDashboard(
    studentId: string,
    filters: StudentTrendsFilterDto,
    school: School,
    user: User,
  ): Promise<ParentDashboardResponseDto> {
    const cacheKey = this.cache.makeKey(studentId);
    const cached = await this.cache.get<ParentDashboardResponseDto>(cacheKey);
    if (cached) return cached;

    const live = await this.computeLiveDashboard(studentId, filters, school, user);
    await this.cache.set(cacheKey, live, 3600);
    return live;
  }

  private async computeLiveDashboard(
    studentId: string,
    filters: StudentTrendsFilterDto,
    school: School,
    user: User,
  ): Promise<ParentDashboardResponseDto> {
    const parent = await this.parentRepository.findOne({
      where: { user: { pkid: user.pkid }, school: { pkid: school.pkid } },
    });
    if (!parent) {
      return { overall: null, areas: [], activities: [], lastUpdated: new Date().toISOString() };
    }

    const qb = this.snapshotRepository
      .createQueryBuilder('snap')
      .innerJoin('snap.student', 'student')
      .where('snap.school_id = :schoolPkid', { schoolPkid: school.pkid })
      .andWhere('student.id = :studentId', { studentId })
      .andWhere('snap.status IN (:...statuses)', {
        statuses: [ESnapshotStatus.PUBLISHED, ESnapshotStatus.SENT],
      })
      .andWhere(
        `snap.student_id IN (
          SELECT sg."student_id" FROM "student_guardians" sg
          WHERE sg."parent_id" = :parentPkid
        )`,
        { parentPkid: parent.pkid },
      )
      .orderBy('snap.periodStart', 'ASC');

    if (filters.type) qb.andWhere('snap.type = :type', { type: filters.type });
    if (filters.weeks) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - filters.weeks * 7);
      qb.andWhere('snap.periodStart >= :cutoff', {
        cutoff: cutoff.toISOString().split('T')[0],
      });
    }

    const snapshots = await qb.getMany();
    if (!snapshots.length) {
      return { overall: null, areas: [], activities: [], lastUpdated: new Date().toISOString() };
    }

    const snapshotPkids = snapshots.map((s) => s.pkid);
    const items = await this.itemRepository
      .createQueryBuilder('item')
      .innerJoinAndSelect('item.activity', 'activity')
      .where('item.snapshot_id IN (:...snapshotPkids)', { snapshotPkids })
      .getMany();

    const latest = snapshots[snapshots.length - 1];
    const previous = snapshots.length > 1 ? snapshots[snapshots.length - 2] : null;

    const itemsBySnapshotPkid = new Map<number, SnapshotActivityItem[]>();
    for (const item of items) {
      const sid = (item as unknown as { snapshot_id: number }).snapshot_id;
      const bucket = itemsBySnapshotPkid.get(sid) ?? [];
      bucket.push(item);
      itemsBySnapshotPkid.set(sid, bucket);
    }

    const latestItems = itemsBySnapshotPkid.get(latest.pkid) ?? [];
    const previousItems = previous ? itemsBySnapshotPkid.get(previous.pkid) ?? [] : [];

    const areaScoresNow = this.groupAreaScores(latestItems);
    const areaScoresPrev = this.groupAreaScores(previousItems);
    const areas = Array.from(areaScoresNow.entries()).map(([areaName, score]) => {
      const prev = areaScoresPrev.get(areaName) ?? null;
      return {
        areaName,
        score,
        trend: this.computeTrend(score, prev),
        color: this.colorFrom(areaName),
      };
    });

    const activitySeries = new Map<
      string,
      { activityId: string; activityName: string; areaName: string | null; series: number[] }
    >();
    const recentSnapshots = snapshots.slice(-8);
    for (const snap of recentSnapshots) {
      const snapItems = itemsBySnapshotPkid.get(snap.pkid) ?? [];
      for (const it of snapItems) {
        const key = it.activity.id;
        const row = activitySeries.get(key) ?? {
          activityId: it.activity.id,
          activityName: it.activity.name,
          areaName: it.learningAreaName ?? null,
          series: [],
        };
        row.series.push(it.averageScore != null ? Number(it.averageScore) : 0);
        activitySeries.set(key, row);
      }
    }

    const activities = Array.from(activitySeries.values()).map((a) => {
      const series = a.series.slice(-8);
      const last = series.length ? series[series.length - 1] : null;
      const prev = series.length > 1 ? series[series.length - 2] : null;
      return {
        activityId: a.activityId,
        activityName: a.activityName,
        areaName: a.areaName,
        averageScore: last,
        trend: this.computeTrend(last, prev),
        sparkline: series,
      };
    });

    return {
      overall: latest.overallScore != null ? Number(latest.overallScore) : null,
      areas,
      activities,
      lastUpdated: (latest.publishedAt ?? latest.updatedAt).toISOString(),
    };
  }

  private groupAreaScores(items: SnapshotActivityItem[]): Map<string, number | null> {
    const map = new Map<string, number[]>();
    for (const it of items) {
      const key = it.learningAreaName ?? 'Uncategorised';
      const arr = map.get(key) ?? [];
      if (it.averageScore != null) arr.push(Number(it.averageScore));
      map.set(key, arr);
    }

    const out = new Map<string, number | null>();
    for (const [k, values] of map.entries()) {
      if (!values.length) out.set(k, null);
      else out.set(k, values.reduce((a, b) => a + b, 0) / values.length);
    }
    return out;
  }

  private computeTrend(current: number | null, previous: number | null): ETrend | null {
    if (current == null || previous == null) return null;
    const delta = current - previous;
    if (delta > 5) return ETrend.IMPROVING;
    if (delta < -5) return ETrend.DECLINING;
    return ETrend.STABLE;
  }

  private colorFrom(seed: string): string {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = (hash << 5) - hash + seed.charCodeAt(i);
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue} 60% 50%)`;
  }
}
