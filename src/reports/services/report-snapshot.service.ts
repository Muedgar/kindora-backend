import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource, Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';

import { School } from 'src/schools/entities/school.entity';
import { Student } from 'src/students/entities/student.entity';
import { User } from 'src/users/entities';
import { Parent } from 'src/parents/entities/parent.entity';
import { StudentGuardian } from 'src/students/entities/student-guardian.entity';
import { FilterResponse } from 'src/common/interfaces/filter-response';

import { ReportSnapshot } from '../entities/report-snapshot.entity';
import { SnapshotActivityItem } from '../entities/snapshot-activity-item.entity';
import { SnapshotReadReceipt } from '../entities/snapshot-read-receipt.entity';
import { DailyReport } from '../entities/daily-report.entity';
import { LearningArea } from '../entities/learning-area.entity';
import { ESnapshotStatus, EReportType } from '../enums/snapshot.enum';
import { AggregationService, ActivityAggregation } from './aggregation.service';
import {
  GenerateSnapshotDto,
  GenerateBulkSnapshotDto,
  ReviewSnapshotDto,
  SnapshotFilterDto,
  AdminSummaryFilterDto,
  StudentTrendsFilterDto,
} from '../dto/snapshot.dto';
import {
  ReportSnapshotSerializer,
  BulkSnapshotResultSerializer,
  AdminWeeklySummarySerializer,
  StudentCoverageSerializer,
  ActivityBreakdownSerializer,
  LearningAreaBreakdownSerializer,
  StudentTrendPeriodSerializer,
} from '../serializers/snapshot.serializer';
import {
  SNAPSHOT_NOT_FOUND,
  SNAPSHOT_ALREADY_PUBLISHED,
} from '../messages/error';
import { NOT_CHILDS_GUARDIAN } from '../messages/error';
import { scoreToBand } from '../enums/snapshot.enum';
import {
  SNAPSHOT_PUBLISHED_EVENT,
  SNAPSHOT_SENT_EVENT,
  SnapshotPublishedPayload,
} from 'src/communication/contracts/domain-events.contract';

/** Emits domain events consumed by communication module (implemented in Phase 5). */

@Injectable()
export class ReportSnapshotService {
  private readonly logger = new Logger(ReportSnapshotService.name);

  constructor(
    @InjectRepository(ReportSnapshot)
    private readonly snapshotRepository: Repository<ReportSnapshot>,
    @InjectRepository(SnapshotActivityItem)
    private readonly itemRepository: Repository<SnapshotActivityItem>,
    @InjectRepository(SnapshotReadReceipt)
    private readonly readReceiptRepository: Repository<SnapshotReadReceipt>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(DailyReport)
    private readonly reportRepository: Repository<DailyReport>,
    @InjectRepository(LearningArea)
    private readonly learningAreaRepository: Repository<LearningArea>,
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
    @InjectRepository(StudentGuardian)
    private readonly guardianRepository: Repository<StudentGuardian>,
    private readonly aggregationService: AggregationService,
    private readonly eventEmitter: EventEmitter2,
    private readonly dataSource: DataSource,
  ) {}

  // ── Snapshot generation ───────────────────────────────────────────────────

  async generateOne(
    dto: GenerateSnapshotDto,
    school: School,
    creator: User,
  ): Promise<ReportSnapshotSerializer> {
    const student = await this.studentRepository.findOne({
      where: { id: dto.studentId, school: { pkid: school.pkid } },
    });
    if (!student) throw new NotFoundException('Student not found');

    return this.generateForStudent(
      student,
      school,
      dto.type,
      dto.periodStart,
      dto.periodEnd,
      creator,
    );
  }

  async generateBulk(
    dto: GenerateBulkSnapshotDto,
    school: School,
    creator: User,
  ): Promise<BulkSnapshotResultSerializer> {
    const students = await this.studentRepository.find({
      where: { school: { pkid: school.pkid } },
    });

    let generated = 0;
    let skipped = 0;
    const errors: { studentId: string; reason: string }[] = [];

    for (const student of students) {
      try {
        await this.generateForStudent(
          student,
          school,
          dto.type,
          dto.periodStart,
          dto.periodEnd,
          creator,
        );
        generated++;
      } catch (err: unknown) {
        if (err instanceof ConflictException) {
          skipped++;
        } else {
          const reason = err instanceof Error ? err.message : 'Unexpected error';
          errors.push({ studentId: student.id, reason });
          this.logger.warn(
            `Failed to generate snapshot for student ${student.id}: ${reason}`,
          );
        }
      }
    }

    return { generated, skipped, failed: errors.length, errors };
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  /**
   * List snapshots with guardian-scoping and parent visibility rules:
   *   • Parents: only see PUBLISHED snapshots for students they are guardian of.
   *   • Staff:   see all statuses, all students in the school.
   */
  async findAll(
    filters: SnapshotFilterDto,
    school: School,
    caller: User,
  ): Promise<FilterResponse<ReportSnapshotSerializer>> {
    const parentProfile = await this.resolveParentProfile(caller, school);

    const qb = this.snapshotRepository
      .createQueryBuilder('snap')
      .innerJoinAndSelect('snap.student', 'student')
      .where('snap.school_id = :schoolPkid', { schoolPkid: school.pkid })
      .orderBy('snap.periodStart', 'DESC')
      .addOrderBy('student.fullName', 'ASC');

    // Parent-only restrictions: published/sent snapshots for their children only.
    if (parentProfile) {
      qb.andWhere('snap.status IN (:...parentStatuses)', {
        parentStatuses: [ESnapshotStatus.PUBLISHED, ESnapshotStatus.SENT],
      });
      qb.andWhere(
        `snap.student_id IN (
          SELECT sg."student_id" FROM "student_guardians" sg
          WHERE sg."parent_id" = :parentPkid
        )`,
        { parentPkid: parentProfile.pkid },
      );
    }

    if (filters.type) {
      qb.andWhere('snap.type = :type', { type: filters.type });
    }
    // Staff can filter by status; parents are already forced to PUBLISHED above.
    if (filters.status && !parentProfile) {
      qb.andWhere('snap.status = :status', { status: filters.status });
    }
    if (filters.studentId) {
      qb.andWhere('student.id = :studentId', { studentId: filters.studentId });
    }
    if (filters.dateFrom) {
      qb.andWhere('snap.periodStart >= :from', { from: filters.dateFrom });
    }
    if (filters.dateTo) {
      qb.andWhere('snap.periodEnd <= :to', { to: filters.dateTo });
    }
    if (filters.search) {
      qb.andWhere('student.fullName ILIKE :search', {
        search: `%${filters.search}%`,
      });
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const [data, count] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    const pages = Math.ceil(count / limit);

    // Attach read-receipt status when caller is a parent.
    const readSet = parentProfile
      ? await this.loadReadSet(
          data.map((s) => s.pkid),
          parentProfile.pkid,
        )
      : new Set<number>();

    return {
      items: data.map((s) => this.serializeLite(s, readSet.has(s.pkid))),
      count,
      pages,
      page,
      limit,
      previousPage: page > 1 ? page - 1 : null,
      nextPage: page < pages ? page + 1 : null,
    };
  }

  /**
   * Student timeline — caller must be a guardian of the student (if a parent),
   * or any staff member of the school.
   */
  async findByStudent(
    studentId: string,
    filters: SnapshotFilterDto,
    school: School,
    caller: User,
  ): Promise<FilterResponse<ReportSnapshotSerializer>> {
    const student = await this.studentRepository.findOne({
      where: { id: studentId, school: { pkid: school.pkid } },
    });
    if (!student) throw new NotFoundException('Student not found');

    await this.assertGuardianOrStaff(student, caller, school);

    return this.findAll({ ...filters, studentId }, school, caller);
  }

  /**
   * Full snapshot detail — includes activity breakdown.
   * Parents may only read PUBLISHED snapshots for their children.
   */
  async findOne(
    id: string,
    school: School,
    caller: User,
  ): Promise<ReportSnapshotSerializer> {
    const snapshot = await this.fetchSnapshotWithRelations(id, school);

    const parentProfile = await this.resolveParentProfile(caller, school);

    if (parentProfile) {
      // Verify guardianship.
      await this.assertGuardianOrStaff(snapshot.student, caller, school);

      // Parents only see published/sent reports.
      if (
        ![ESnapshotStatus.PUBLISHED, ESnapshotStatus.SENT].includes(
          snapshot.status as ESnapshotStatus,
        )
      ) {
        throw new NotFoundException(SNAPSHOT_NOT_FOUND);
      }
    }

    const isRead = parentProfile
      ? !!(await this.readReceiptRepository.findOne({
          where: {
            snapshot: { pkid: snapshot.pkid },
            parent: { pkid: parentProfile.pkid },
          },
        }))
      : false;

    return this.serialize(snapshot, isRead);
  }

  // ── Read receipts ─────────────────────────────────────────────────────────

  /**
   * Mark a published snapshot as read by the calling parent.
   * Idempotent — calling again is a no-op, returns the same timestamp.
   */
  async markAsRead(
    id: string,
    school: School,
    caller: User,
  ): Promise<{ readAt: Date }> {
    const snapshot = await this.fetchSnapshotWithRelations(id, school);

    if (
      ![ESnapshotStatus.PUBLISHED, ESnapshotStatus.SENT].includes(
        snapshot.status as ESnapshotStatus,
      )
    ) {
      throw new BadRequestException(
        'Only published/sent snapshots can be marked as read.',
      );
    }

    const parentProfile = await this.resolveParentProfile(caller, school);
    if (!parentProfile) {
      throw new ForbiddenException('Only parents can mark snapshots as read.');
    }

    await this.assertGuardianOrStaff(snapshot.student, caller, school);

    const existing = await this.readReceiptRepository.findOne({
      where: {
        snapshot: { pkid: snapshot.pkid },
        parent: { pkid: parentProfile.pkid },
      },
    });

    if (existing) return { readAt: existing.readAt };

    const receipt = this.readReceiptRepository.create({
      snapshot,
      parent: parentProfile,
      readAt: new Date(),
    });
    await this.readReceiptRepository.save(receipt);

    return { readAt: receipt.readAt };
  }

  /**
   * Unread report count — used for the badge in the parent mobile app.
   * Returns the count of PUBLISHED/SENT snapshots the parent has NOT yet read,
   * across all of their children in this school.
   */
  async getUnreadCount(school: School, caller: User): Promise<{ unread: number }> {
    const parentProfile = await this.resolveParentProfile(caller, school);
    if (!parentProfile) return { unread: 0 };

    const unread = await this.snapshotRepository
      .createQueryBuilder('snap')
      .where('snap.school_id = :schoolPkid', { schoolPkid: school.pkid })
      .andWhere('snap.status IN (:...statuses)', {
        statuses: [ESnapshotStatus.PUBLISHED, ESnapshotStatus.SENT],
      })
      .andWhere(
        `snap.student_id IN (
          SELECT sg."student_id" FROM "student_guardians" sg
          WHERE sg."parent_id" = :parentPkid
        )`,
        { parentPkid: parentProfile.pkid },
      )
      .andWhere(
        `snap.pkid NOT IN (
          SELECT rr."snapshot_id" FROM "snapshot_read_receipts" rr
          WHERE rr."parent_id" = :parentPkid2
        )`,
        { parentPkid2: parentProfile.pkid },
      )
      .getCount();

    return { unread };
  }

  // ── Time-series trends (development dashboard) ────────────────────────────

  /**
   * Returns chart-ready time-series data for a student's progress.
   * Each entry = one snapshot period with headline score and per-learning-area
   * averages. Intended for the parent development dashboard.
   *
   * Guardian check applied: parents may only query their own children.
   */
  async getStudentTrends(
    studentId: string,
    filters: StudentTrendsFilterDto,
    school: School,
    caller: User,
  ): Promise<StudentTrendPeriodSerializer[]> {
    const student = await this.studentRepository.findOne({
      where: { id: studentId, school: { pkid: school.pkid } },
    });
    if (!student) throw new NotFoundException('Student not found');

    await this.assertGuardianOrStaff(student, caller, school);

    const parentProfile = await this.resolveParentProfile(caller, school);

    const qb = this.snapshotRepository
      .createQueryBuilder('snap')
      .innerJoin('snap.student', 'student')
      .where('snap.school_id = :schoolPkid', { schoolPkid: school.pkid })
      .andWhere('snap.student_id = :studentPkid', { studentPkid: student.pkid })
      .orderBy('snap.periodStart', 'ASC');

    // Parents only see published/sent snapshots.
    if (parentProfile) {
      qb.andWhere('snap.status IN (:...statuses)', {
        statuses: [ESnapshotStatus.PUBLISHED, ESnapshotStatus.SENT],
      });
    }

    if (filters.type) {
      qb.andWhere('snap.type = :type', { type: filters.type });
    }
    if (filters.weeks) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - filters.weeks * 7);
      qb.andWhere('snap.periodStart >= :cutoff', {
        cutoff: cutoff.toISOString().split('T')[0],
      });
    }

    const snapshots = await qb.getMany();
    if (!snapshots.length) return [];

    // Load activity items for all snapshots in a single query.
    const snapshotPkids = snapshots.map((s) => s.pkid);
    const items = await this.itemRepository
      .createQueryBuilder('item')
      .innerJoinAndSelect('item.activity', 'activity')
      .where('item.snapshot_id IN (:...pkids)', { pkids: snapshotPkids })
      .getMany();

    const itemsBySnapshot = new Map<number, typeof items>();
    for (const item of items) {
      // item.snapshot is not loaded, but snapshot_id FK is on pkid
      // We need to group by snapshot pkid — use raw query for this
      const snapPkid = (item as unknown as { snapshot_id: number }).snapshot_id;
      const bucket = itemsBySnapshot.get(snapPkid) ?? [];
      bucket.push(item);
      itemsBySnapshot.set(snapPkid, bucket);
    }

    return snapshots.map((snap) => {
      const snapItems = itemsBySnapshot.get(snap.pkid) ?? [];

      // Group by learning area name.
      const laMap = new Map<string, { scores: number[]; count: number }>();
      for (const item of snapItems) {
        const key = item.learningAreaName ?? 'Uncategorised';
        const bucket = laMap.get(key) ?? { scores: [], count: 0 };
        bucket.count += item.observationCount;
        if (item.averageScore != null) {
          bucket.scores.push(parseFloat(String(item.averageScore)));
        }
        laMap.set(key, bucket);
      }

      const byLearningArea = Array.from(laMap.entries()).map(
        ([name, bucket]) => {
          const avg = this.avg(bucket.scores);
          return {
            learningAreaName: name,
            averageScore: avg,
            observationCount: bucket.count,
            performanceBand: scoreToBand(avg),
          };
        },
      );
      byLearningArea.sort((a, b) =>
        a.learningAreaName.localeCompare(b.learningAreaName),
      );

      return {
        periodStart: snap.periodStart,
        periodEnd: snap.periodEnd,
        type: snap.type,
        overallScore: this.coerceDecimal(snap.overallScore),
        trend: snap.trend ?? null,
        performanceBand: scoreToBand(this.coerceDecimal(snap.overallScore)),
        totalObservations: snap.totalObservations,
        byLearningArea,
      } satisfies StudentTrendPeriodSerializer;
    });
  }

  // ── Teacher review workflow ───────────────────────────────────────────────

  async review(
    id: string,
    dto: ReviewSnapshotDto,
    reviewer: User,
    school: School,
  ): Promise<ReportSnapshotSerializer> {
    const snapshot = await this.findSnapshotOrFail(id, school);

    if (snapshot.status === ESnapshotStatus.PUBLISHED) {
      throw new BadRequestException(
        'Cannot edit a published snapshot. Publish a new one instead.',
      );
    }

    snapshot.teacherNotes = dto.teacherNotes;
    snapshot.reviewedBy = reviewer;
    snapshot.reviewedAt = new Date();
    snapshot.status = ESnapshotStatus.PENDING_REVIEW;
    snapshot.updatedBy = reviewer;

    const saved = await this.snapshotRepository.save(snapshot);
    return this.serializeLite(saved, false);
  }

  /**
   * Publish a snapshot — makes it visible to parents/guardians.
   * Emits `snapshot.published` for the push notification module.
   */
  async publish(
    id: string,
    publisher: User,
    school: School,
  ): Promise<ReportSnapshotSerializer> {
    const snapshot = await this.findSnapshotOrFail(id, school, ['student']);

    if (snapshot.status === ESnapshotStatus.PUBLISHED) {
      throw new BadRequestException('Snapshot is already published.');
    }

    snapshot.status = ESnapshotStatus.PUBLISHED;
    snapshot.publishedAt = new Date();
    snapshot.updatedBy = publisher;

    const saved = await this.snapshotRepository.save(snapshot);

    // Fire-and-forget: push notification module picks this up.
    const payload: SnapshotPublishedPayload = {
      snapshotId: saved.id,
      studentId: snapshot.student.id,
      schoolId: school.id,
      studentName: snapshot.student.fullName,
      periodStart: String(snapshot.periodStart),
      periodEnd: String(snapshot.periodEnd),
    };
    this.eventEmitter.emit(SNAPSHOT_PUBLISHED_EVENT, payload);

    return this.serializeLite(saved, false);
  }

  // ── Admin operational summary (UC4) ──────────────────────────────────────

  async getAdminWeeklySummary(
    filters: AdminSummaryFilterDto,
    school: School,
  ): Promise<AdminWeeklySummarySerializer> {
    const reports = await this.reportRepository
      .createQueryBuilder('dr')
      .innerJoinAndSelect('dr.student', 'student')
      .innerJoinAndSelect('dr.activity', 'activity')
      .where('dr.school_id = :schoolPkid', { schoolPkid: school.pkid })
      .andWhere('dr.date >= :from', { from: filters.dateFrom })
      .andWhere('dr.date <= :to', { to: filters.dateTo })
      .getMany();

    const totalStudents = await this.studentRepository.count({
      where: { school: { pkid: school.pkid } },
    });
    const allStudents = await this.studentRepository.find({
      where: { school: { pkid: school.pkid } },
    });

    const observedStudentPkids = new Set(reports.map((r) => r.student.pkid));

    const studentsWithNoActivity: StudentCoverageSerializer[] = allStudents
      .filter((s) => !observedStudentPkids.has(s.pkid))
      .map((s) => ({
        studentId: s.id,
        studentName: s.fullName,
        observationCount: 0,
      }));

    const activityMap = new Map<
      number,
      { reports: DailyReport[]; learningAreaName: string | null }
    >();
    for (const r of reports) {
      const key = r.activity.pkid;
      const bucket = activityMap.get(key) ?? { reports: [], learningAreaName: null };
      bucket.reports.push(r);
      activityMap.set(key, bucket);
    }

    const activityPkids = [...activityMap.keys()];
    const laRows: { activity_pkid: number; la_name: string }[] =
      activityPkids.length
        ? await this.learningAreaRepository
            .createQueryBuilder('la')
            .select('a.pkid', 'activity_pkid')
            .addSelect('la.name', 'la_name')
            .innerJoin('la.activities', 'a')
            .where('a.pkid IN (:...pkids)', { pkids: activityPkids })
            .andWhere('la.school_id = :schoolPkid', { schoolPkid: school.pkid })
            .orderBy('la.name', 'ASC')
            .getRawMany()
        : [];

    const laNameByActivity = new Map<number, string>();
    for (const row of laRows) {
      if (!laNameByActivity.has(row.activity_pkid)) {
        laNameByActivity.set(row.activity_pkid, row.la_name);
      }
    }

    const byActivity: ActivityBreakdownSerializer[] = [];
    for (const [pkid, bucket] of activityMap) {
      const { activity } = bucket.reports[0];
      const scores = bucket.reports
        .map((r) => this.coerceDecimal(r.normalisedScore))
        .filter((s): s is number => s !== null);
      const avg = this.avg(scores);
      const laName = laNameByActivity.get(pkid) ?? null;
      byActivity.push({
        activityId: activity.id,
        activityName: activity.name,
        learningAreaName: laName,
        observationCount: bucket.reports.length,
        averageScore: avg,
        performanceBand: scoreToBand(avg),
      });
    }
    byActivity.sort((a, b) => a.activityName.localeCompare(b.activityName));

    const laMap = new Map<string, { scores: number[]; count: number }>();
    for (const item of byActivity) {
      const key = item.learningAreaName ?? 'Uncategorised';
      const bucket = laMap.get(key) ?? { scores: [], count: 0 };
      bucket.count += item.observationCount;
      if (item.averageScore !== null) bucket.scores.push(item.averageScore);
      laMap.set(key, bucket);
    }
    const byLearningArea: LearningAreaBreakdownSerializer[] = [];
    for (const [name, bucket] of laMap) {
      const avg = this.avg(bucket.scores);
      byLearningArea.push({
        learningAreaName: name,
        observationCount: bucket.count,
        averageScore: avg,
        performanceBand: scoreToBand(avg),
      });
    }
    byLearningArea.sort((a, b) => a.learningAreaName.localeCompare(b.learningAreaName));

    return {
      period: { from: filters.dateFrom, to: filters.dateTo },
      totalObservations: reports.length,
      activeStudents: observedStudentPkids.size,
      totalStudents,
      coveragePercent:
        totalStudents > 0
          ? Math.round((observedStudentPkids.size / totalStudents) * 100)
          : 0,
      studentsWithNoActivity,
      byLearningArea,
      byActivity,
    };
  }

  // ── Core generation logic ─────────────────────────────────────────────────

  async generateForStudent(
    student: Student,
    school: School,
    type: EReportType,
    periodStart: string,
    periodEnd: string,
    creator: User,
  ): Promise<ReportSnapshotSerializer> {
    const existing = await this.snapshotRepository.findOne({
      where: {
        student: { pkid: student.pkid },
        school: { pkid: school.pkid },
        type,
        periodStart: periodStart as unknown as Date,
        periodEnd: periodEnd as unknown as Date,
      },
    });

    if (existing?.status === ESnapshotStatus.PUBLISHED) {
      throw new ConflictException(SNAPSHOT_ALREADY_PUBLISHED);
    }

    const aggregations = await this.aggregationService.aggregateStudentPeriod(
      student.pkid,
      school.pkid,
      periodStart,
      periodEnd,
    );

    const totalObservations = aggregations.reduce(
      (sum, a) => sum + a.observationCount,
      0,
    );
    const overallScore = this.aggregationService.computeOverallScore(aggregations);
    const trend = this.aggregationService.computeOverallTrend(aggregations);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const snapRepo = queryRunner.manager.getRepository(ReportSnapshot);
      const itemRepo = queryRunner.manager.getRepository(SnapshotActivityItem);

      if (existing) await snapRepo.remove(existing);

      const snapshot = snapRepo.create({
        school,
        student,
        type,
        periodStart: periodStart as unknown as Date,
        periodEnd: periodEnd as unknown as Date,
        totalObservations,
        overallScore: overallScore ?? undefined,
        trend: trend ?? undefined,
        status: ESnapshotStatus.DRAFT,
        createdBy: creator,
      });
      const savedSnapshot = await snapRepo.save(snapshot);

      const items = aggregations.map((agg) =>
        this.buildActivityItem(savedSnapshot, agg),
      );
      await itemRepo.save(items);

      await queryRunner.commitTransaction();

      // Internal fetch — no guardian check needed (creator is always staff/system).
      return this.serialize(
        await this.fetchSnapshotWithRelations(savedSnapshot.id, school),
        false,
      );
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  /**
   * Resolve the parent profile for a user in a school.
   * Returns null if the caller is not a registered parent (= staff).
   */
  private async resolveParentProfile(
    caller: User,
    school: School,
  ): Promise<Parent | null> {
    return this.parentRepository.findOne({
      where: { user: { pkid: caller.pkid }, school: { pkid: school.pkid } },
    });
  }

  /**
   * If the caller has a Parent profile in this school, verify they have a
   * StudentGuardian record for the given student. Staff callers pass through.
   */
  private async assertGuardianOrStaff(
    student: Student,
    caller: User,
    school: School,
  ): Promise<void> {
    const parentProfile = await this.resolveParentProfile(caller, school);
    if (!parentProfile) return; // staff — no restriction

    const guardianship = await this.guardianRepository.findOne({
      where: {
        student: { pkid: student.pkid },
        parent: { pkid: parentProfile.pkid },
      },
    });

    if (!guardianship) throw new ForbiddenException(NOT_CHILDS_GUARDIAN);
  }

  /** Load read-receipt pkids for a set of snapshot pkids for one parent. */
  private async loadReadSet(
    snapshotPkids: number[],
    parentPkid: number,
  ): Promise<Set<number>> {
    if (!snapshotPkids.length) return new Set();
    const receipts = await this.readReceiptRepository
      .createQueryBuilder('rr')
      .select('rr.snapshot_id', 'snapshot_id')
      .where('rr.snapshot_id IN (:...pkids)', { pkids: snapshotPkids })
      .andWhere('rr.parent_id = :parentPkid', { parentPkid })
      .getRawMany<{ snapshot_id: number }>();
    return new Set(receipts.map((r) => r.snapshot_id));
  }

  /** Load snapshot with full relations. Throws 404 if not found in school. */
  private async fetchSnapshotWithRelations(
    id: string,
    school: School,
    extraRelations: string[] = [],
  ): Promise<ReportSnapshot> {
    const snapshot = await this.snapshotRepository.findOne({
      where: { id, school: { pkid: school.pkid } },
      relations: [
        'student',
        'activityItems',
        'activityItems.activity',
        'activityItems.learningArea',
        'reviewedBy',
        ...extraRelations,
      ],
    });
    if (!snapshot) throw new NotFoundException(SNAPSHOT_NOT_FOUND);
    return snapshot;
  }

  private async findSnapshotOrFail(
    id: string,
    school: School,
    relations: string[] = [],
  ): Promise<ReportSnapshot> {
    const snapshot = await this.snapshotRepository.findOne({
      where: { id, school: { pkid: school.pkid } },
      relations,
    });
    if (!snapshot) throw new NotFoundException(SNAPSHOT_NOT_FOUND);
    return snapshot;
  }

  private buildActivityItem(
    snapshot: ReportSnapshot,
    agg: ActivityAggregation,
  ): Partial<SnapshotActivityItem> {
    return {
      snapshot,
      activity: { pkid: agg.activityPkid } as never,
      learningArea: agg.learningAreaPkid
        ? ({ pkid: agg.learningAreaPkid } as never)
        : undefined,
      learningAreaName: agg.learningAreaName ?? undefined,
      observationCount: agg.observationCount,
      averageScore: agg.averageScore ?? undefined,
      firstScore: agg.firstScore ?? undefined,
      lastScore: agg.lastScore ?? undefined,
      trend: agg.trend ?? undefined,
      latestRawValue: agg.latestRawValue,
    };
  }

  private serialize(
    snapshot: ReportSnapshot,
    isRead: boolean,
  ): ReportSnapshotSerializer {
    return plainToInstance(
      ReportSnapshotSerializer,
      { ...snapshot, isRead },
      { excludeExtraneousValues: true },
    );
  }

  private serializeLite(
    snapshot: ReportSnapshot,
    isRead: boolean,
  ): ReportSnapshotSerializer {
    return plainToInstance(
      ReportSnapshotSerializer,
      { ...snapshot, activityItems: [], isRead },
      { excludeExtraneousValues: true },
    );
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
