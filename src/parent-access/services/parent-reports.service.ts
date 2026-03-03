import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FilterResponse } from 'src/common/interfaces';
import { Parent } from 'src/parents/entities/parent.entity';
import { SnapshotFilterDto } from 'src/reports/dto/snapshot.dto';
import { ESnapshotStatus } from 'src/reports/enums/snapshot.enum';
import { ReportSnapshot } from 'src/reports/entities/report-snapshot.entity';
import { School } from 'src/schools/entities/school.entity';
import { User } from 'src/users/entities';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';

@Injectable()
export class ParentReportsService {
  constructor(
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
    @InjectRepository(ReportSnapshot)
    private readonly snapshotRepository: Repository<ReportSnapshot>,
  ) {}

  async getReports(
    filters: SnapshotFilterDto,
    school: School,
    user: User,
  ): Promise<FilterResponse<ReportSnapshot>> {
    const parent = await this.parentRepository.findOne({
      where: { user: { pkid: user.pkid }, school: { pkid: school.pkid } },
    });
    if (!parent) {
      return {
        items: [],
        count: 0,
        pages: 0,
        previousPage: null,
        page: filters.page ?? 1,
        nextPage: null,
        limit: filters.limit ?? 20,
      };
    }

    const allowedStatuses = [ESnapshotStatus.PUBLISHED, ESnapshotStatus.SENT];
    const qb = this.snapshotRepository
      .createQueryBuilder('snap')
      .innerJoinAndSelect('snap.student', 'student')
      .leftJoinAndSelect('snap.activityItems', 'activityItems')
      .leftJoinAndSelect('activityItems.activity', 'activity')
      .where('snap.school_id = :schoolPkid', { schoolPkid: school.pkid })
      .andWhere('snap.status IN (:...statuses)', { statuses: allowedStatuses })
      .andWhere(
        `snap.student_id IN (
          SELECT sg."student_id" FROM "student_guardians" sg
          WHERE sg."parent_id" = :parentPkid
        )`,
        { parentPkid: parent.pkid },
      )
      .orderBy('snap.publishedAt', 'DESC')
      .addOrderBy('snap.periodEnd', 'DESC');

    if (filters.type) qb.andWhere('snap.type = :type', { type: filters.type });
    if (filters.studentId) qb.andWhere('student.id = :studentId', { studentId: filters.studentId });
    if (filters.dateFrom) qb.andWhere('snap.periodStart >= :dateFrom', { dateFrom: filters.dateFrom });
    if (filters.dateTo) qb.andWhere('snap.periodEnd <= :dateTo', { dateTo: filters.dateTo });

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const [items, count] = await qb.skip((page - 1) * limit).take(limit).getManyAndCount();
    const pages = Math.ceil(count / limit);

    return {
      items,
      count,
      pages,
      previousPage: page > 1 ? page - 1 : null,
      page,
      nextPage: page < pages ? page + 1 : null,
      limit,
    };
  }

  async getReportById(id: string, school: School, user: User): Promise<ReportSnapshot> {
    const parent = await this.parentRepository.findOne({
      where: { user: { pkid: user.pkid }, school: { pkid: school.pkid } },
    });
    if (!parent) throw new NotFoundException('Report snapshot not found');

    const snapshot = await this.snapshotRepository
      .createQueryBuilder('snap')
      .innerJoinAndSelect('snap.student', 'student')
      .leftJoinAndSelect('snap.activityItems', 'activityItems')
      .leftJoinAndSelect('activityItems.activity', 'activity')
      .where('snap.id = :id', { id })
      .andWhere('snap.school_id = :schoolPkid', { schoolPkid: school.pkid })
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
      .getOne();

    if (!snapshot) throw new NotFoundException('Report snapshot not found');
    return snapshot;
  }
}
