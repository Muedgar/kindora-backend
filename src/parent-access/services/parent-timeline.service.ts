import { Injectable } from '@nestjs/common';
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
      .leftJoinAndSelect('activity.learningAreas', 'learningArea')
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
      const [cursorDate, cursorPkidRaw] = query.cursor.split('::');
      const cursorPkid = Number(cursorPkidRaw);
      if (cursorDate && Number.isInteger(cursorPkid)) {
        qb.andWhere('(dr.date < :cursorDate OR (dr.date = :cursorDate AND dr.pkid < :cursorPkid))', {
          cursorDate,
          cursorPkid,
        });
      }
    }

    return qb.getMany().then((rows) => {
      const hasMore = rows.length > pageSize;
      const items = (hasMore ? rows.slice(0, pageSize) : rows).map((r) => ({
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
        learningArea:
          r.activity.learningAreas?.length > 0
            ? {
                id: r.activity.learningAreas[0].id,
                name: r.activity.learningAreas[0].name,
              }
            : null,
        mediaId: null,
        mediaPreviewUrl: null,
      }));

      const last = items[items.length - 1];
      const lastPkid = hasMore ? rows[pageSize - 1].pkid : null;
      const nextCursor =
        hasMore && last && lastPkid ? `${String(last.date).split('T')[0]}::${lastPkid}` : null;

      return {
        items,
        pageSize,
        nextCursor,
      };
    });
  }
}
