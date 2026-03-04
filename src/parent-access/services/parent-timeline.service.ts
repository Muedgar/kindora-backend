import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DailyReport } from 'src/reports/entities/daily-report.entity';
import { School } from 'src/schools/entities/school.entity';
import { User } from 'src/users/entities';
import { Repository } from 'typeorm';
import { ParentTimelineQueryDto } from '../dto/parent-timeline-query.dto';

@Injectable()
export class ParentTimelineService {
  constructor(
    @InjectRepository(DailyReport)
    private readonly dailyReportRepository: Repository<DailyReport>,
  ) {}

  getTimeline(
    studentId: string,
    query: ParentTimelineQueryDto,
    school: School,
    _user: User,
  ) {
    const pageSize = query.pageSize ?? 20;

    const qb = this.dailyReportRepository
      .createQueryBuilder('dr')
      .innerJoinAndSelect('dr.activity', 'activity')
      .where('dr.school_id = :schoolPkid', { schoolPkid: school.pkid })
      .andWhere('dr.student_id = (SELECT s.pkid FROM students s WHERE s.id = :studentId)', {
        studentId,
      })
      .andWhere('dr.visibleToParents = true')
      .orderBy('dr.date', 'DESC')
      .addOrderBy('dr.pkid', 'DESC')
      .take(pageSize + 1);

    if (query.date) {
      qb.andWhere('dr.date = :date', { date: query.date });
    }

    if (query.cursor) {
      const cursor = this.parseCursorOrThrow(query.cursor);
      qb.andWhere(
        '(dr.date < :cursorDate OR (dr.date = :cursorDate AND dr.pkid < :cursorPkid))',
        {
          cursorDate: cursor.date,
          cursorPkid: cursor.pkid,
        },
      );
    }

    return qb.getMany().then(async (rows) => {
      const hasMore = rows.length > pageSize;
      const pageRows = hasMore ? rows.slice(0, pageSize) : rows;
      const learningAreaByActivityId =
        this.extractLearningAreasFromRows(pageRows);
      const activityIds = pageRows.map((r) => r.activity.id);
      if (learningAreaByActivityId.size < new Set(activityIds).size) {
        const lookedUp = await this.fetchLearningAreasByActivity(
          activityIds,
          school.pkid,
        );
        for (const [activityId, learningArea] of lookedUp.entries()) {
          if (!learningAreaByActivityId.has(activityId)) {
            learningAreaByActivityId.set(activityId, learningArea);
          }
        }
      }

      const items = pageRows.map((r) => ({
        id: r.id,
        date: r.date,
        rawValue: r.rawValue,
        normalisedScore: r.normalisedScore != null ? Number(r.normalisedScore) : null,
        teacherNote: r.comments ?? null,
        visibleToParents: r.visibleToParents,
        activity: {
          id: r.activity.id,
          name: r.activity.name,
          gradingType: r.activity.gradingType,
        },
        learningArea: learningAreaByActivityId.get(r.activity.id) ?? null,
        mediaId: r.mediaId ?? null,
        mediaPreviewUrl: r.mediaPreviewUrl ?? null,
      }));

      const last = items[items.length - 1];
      const lastPkid = hasMore ? rows[pageSize - 1].pkid : null;
      const dateCursor =
        last?.date instanceof Date
          ? last.date.toISOString().split('T')[0]
          : String(last?.date ?? '').split('T')[0];
      const nextCursor =
        hasMore && last && lastPkid ? `${dateCursor}::${lastPkid}` : null;

      return {
        items,
        pageSize,
        nextCursor,
      };
    });
  }

  private parseCursorOrThrow(cursor: string): { date: string; pkid: number } {
    const match = /^(\d{4}-\d{2}-\d{2})::(\d+)$/.exec(cursor);
    if (!match) {
      throw new BadRequestException(
        'Invalid cursor format. Expected YYYY-MM-DD::pkid',
      );
    }

    const [, date, pkidRaw] = match;
    const pkid = Number(pkidRaw);
    if (!Number.isInteger(pkid)) {
      throw new BadRequestException(
        'Invalid cursor format. Expected YYYY-MM-DD::pkid',
      );
    }
    const parsed = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
      throw new BadRequestException(
        'Invalid cursor format. Expected YYYY-MM-DD::pkid',
      );
    }
    return { date, pkid };
  }

  private async fetchLearningAreasByActivity(
    activityIds: string[],
    schoolPkid: number,
  ): Promise<Map<string, { id: string; name: string }>> {
    if (!activityIds.length) return new Map();

    const rows = await this.dailyReportRepository
      .createQueryBuilder()
      .select('a.id', 'activity_id')
      .addSelect('la.id', 'learning_area_id')
      .addSelect('la.name', 'learning_area_name')
      .from('learning_areas', 'la')
      .innerJoin(
        'learning_area_activities',
        'laa',
        'laa.learning_area_id = la.id',
      )
      .innerJoin('activities', 'a', 'a.id = laa.activity_id')
      .where('a.id IN (:...activityIds)', { activityIds })
      .andWhere('la.school_id = :schoolPkid', { schoolPkid })
      .orderBy('la.name', 'ASC')
      .getRawMany<{
        activity_id: string;
        learning_area_id: string;
        learning_area_name: string;
      }>();

    const map = new Map<string, { id: string; name: string }>();
    for (const row of rows) {
      if (!map.has(row.activity_id)) {
        map.set(row.activity_id, {
          id: row.learning_area_id,
          name: row.learning_area_name,
        });
      }
    }
    return map;
  }

  private extractLearningAreasFromRows(
    rows: Array<{
      activity: { id: string; learningAreas?: Array<{ id: string; name: string }> };
    }>,
  ): Map<string, { id: string; name: string }> {
    const map = new Map<string, { id: string; name: string }>();
    for (const row of rows) {
      const first = row.activity.learningAreas?.[0];
      if (!first) continue;
      if (!map.has(row.activity.id)) {
        map.set(row.activity.id, { id: first.id, name: first.name });
      }
    }
    return map;
  }
}
