import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';

import { School } from 'src/schools/entities/school.entity';
import { User } from 'src/users/entities';
import { Student } from 'src/students/entities/student.entity';
import { Parent } from 'src/parents/entities/parent.entity';
import { StudentGuardian } from 'src/students/entities/student-guardian.entity';
import { ListFilterDTO } from 'src/common/dtos';
import { FilterResponse } from 'src/common/interfaces';

import { DailyReport } from '../entities/daily-report.entity';
import { Activity } from '../entities/activity.entity';
import {
  EGradingType,
  FrequencyGradingConfig,
  NumericGradingConfig,
} from '../enums/grading-type.enum';
import { NormalisationService } from './normalisation.service';
import {
  CreateDailyReportDto,
  CreateBatchDailyReportDto,
  UpdateDailyReportDto,
  BatchObservationItemDto,
} from '../dto/daily-report.dto';
import { ReportFilterDto } from '../dto/report-filter.dto';
import {
  DailyReportSerializer,
  BatchDailyReportSerializer,
  BatchResultItemSerializer,
} from '../serializers/daily-report.serializer';
import {
  DAILY_REPORT_NOT_FOUND,
  ACTIVITY_NOT_FOUND,
  STUDENT_NOT_FOUND,
  INVALID_RAW_VALUE,
  NUMERIC_VALUE_OUT_OF_RANGE,
  FREQUENCY_VALUE_OUT_OF_RANGE,
  NOT_CHILDS_GUARDIAN,
} from '../messages/error';

@Injectable()
export class DailyReportService {
  constructor(
    @InjectRepository(DailyReport)
    private readonly reportRepository: Repository<DailyReport>,
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    @InjectRepository(Student)
    private readonly studentRepository: Repository<Student>,
    @InjectRepository(Parent)
    private readonly parentRepository: Repository<Parent>,
    @InjectRepository(StudentGuardian)
    private readonly guardianRepository: Repository<StudentGuardian>,
    private readonly normalisationService: NormalisationService,
    private readonly dataSource: DataSource,
  ) {}

  // ── Single observation ────────────────────────────────────────────────────

  async createSingle(
    dto: CreateDailyReportDto,
    school: School,
    user: User,
  ): Promise<DailyReportSerializer> {
    const { activity, student } = await this.resolveAndValidate(
      dto.activityId,
      dto.studentId,
      school,
    );

    this.validateRawValue(dto.rawValue, activity);

    const normalisedScore = this.normalisationService.normalise(
      dto.rawValue,
      activity.gradingType,
      activity.gradingConfig,
    );

    const report = await this.upsertReport({
      school,
      student,
      activity,
      date: dto.date,
      rawValue: dto.rawValue,
      normalisedScore,
      comments: dto.comments,
      mediaId: dto.mediaId,
      mediaPreviewUrl: dto.mediaPreviewUrl,
      user,
    });

    return this.serialize(report);
  }

  // ── Batch observations (staff mobile: whole-class recording) ──────────────

  async createBatch(
    dto: CreateBatchDailyReportDto,
    school: School,
    user: User,
  ): Promise<BatchDailyReportSerializer> {
    // 1. Load the shared activity — school scoped via WHERE to prevent cross-school access.
    const activity = await this.activityRepository.findOne({
      where: { id: dto.activityId, school: { pkid: school.pkid } },
    });
    if (!activity) throw new NotFoundException(ACTIVITY_NOT_FOUND);

    // 2. Load all students referenced in the batch in a single query,
    //    filtering by school_id at the DB level.
    const studentIds = dto.observations.map((o) => o.studentId);
    const students = await this.studentRepository
      .createQueryBuilder('s')
      .where('s.id IN (:...ids)', { ids: studentIds })
      .andWhere('s.school_id = :schoolPkid', { schoolPkid: school.pkid })
      .getMany();

    const studentMap = new Map(students.map((s) => [s.id, s]));

    // 3. Process each observation inside a single transaction.
    //    Per-item errors are captured and returned — they do not abort the batch.
    const results: BatchResultItemSerializer[] = [];
    let succeeded = 0;
    let failed = 0;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const obs of dto.observations) {
        const result = await this.processBatchItem(
          obs,
          activity,
          studentMap,
          dto.date,
          school,
          user,
          queryRunner.manager.getRepository(DailyReport),
        );
        results.push(result);
        if (result.success) succeeded++;
        else failed++;
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    return { succeeded, failed, results };
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  async findAll(
    filters: ReportFilterDto,
    school: School,
  ): Promise<FilterResponse<DailyReportSerializer>> {
    const qb = this.reportRepository
      .createQueryBuilder('dr')
      .innerJoinAndSelect('dr.activity', 'activity')
      .innerJoinAndSelect('dr.student', 'student')
      // school scoping via FK column — avoids loading the relation just to compare
      .where('dr.school_id = :schoolPkid', { schoolPkid: school.pkid })
      .orderBy('dr.date', 'DESC')
      .addOrderBy('dr.createdAt', 'DESC');

    if (filters.search) {
      qb.andWhere('student.fullName ILIKE :search', {
        search: `%${filters.search}%`,
      });
    }

    if (filters.dateFrom) {
      qb.andWhere('dr.date >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      qb.andWhere('dr.date <= :dateTo', { dateTo: filters.dateTo });
    }

    if (filters.activityId) {
      qb.andWhere('activity.id = :activityId', {
        activityId: filters.activityId,
      });
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const [data, count] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    const pages = Math.ceil(count / limit);

    return {
      items: data.map((r) => this.serialize(r)),
      count,
      pages,
      page,
      limit,
      previousPage: page > 1 ? page - 1 : null,
      nextPage: page < pages ? page + 1 : null,
    };
  }

  /**
   * Fetch all observations for one student, paginated.
   *
   * Access rules:
   *   - Staff (teacher, admin, etc.) — may view any student in their school.
   *   - Parent — must have an active StudentGuardian record for this student.
   *     If the caller has a Parent profile in this school but no guardianship
   *     for the requested student, a ForbiddenException is thrown.
   *     Callers with no Parent profile are treated as staff.
   */
  async findByStudent(
    studentId: string,
    filters: ReportFilterDto,
    school: School,
    caller: User,
  ): Promise<FilterResponse<DailyReportSerializer>> {
    // School-scoped student lookup — if the student doesn't exist in this school,
    // return not-found (avoids leaking that the student exists elsewhere).
    const student = await this.studentRepository.findOne({
      where: { id: studentId, school: { pkid: school.pkid } },
    });
    if (!student) throw new NotFoundException(STUDENT_NOT_FOUND);

    // ── Guardian-scoping ────────────────────────────────────────────────────
    // If the caller has a Parent profile in this school, enforce that they
    // are a registered guardian for this specific student.
    const parentProfile = await this.parentRepository.findOne({
      where: {
        user: { pkid: caller.pkid },
        school: { pkid: school.pkid },
      },
    });

    if (parentProfile) {
      const guardianship = await this.guardianRepository.findOne({
        where: {
          student: { pkid: student.pkid },
          parent: { pkid: parentProfile.pkid },
        },
      });

      if (!guardianship) {
        throw new ForbiddenException(NOT_CHILDS_GUARDIAN);
      }
    }
    // ── End guardian-scoping ────────────────────────────────────────────────

    const qb = this.reportRepository
      .createQueryBuilder('dr')
      .innerJoinAndSelect('dr.activity', 'activity')
      .innerJoinAndSelect('dr.student', 'student')
      .where('dr.school_id = :schoolPkid', { schoolPkid: school.pkid })
      .andWhere('dr.student_id = :studentPkid', { studentPkid: student.pkid })
      .orderBy('dr.date', 'DESC');

    // Parents only see observations the teacher has marked as visible.
    if (parentProfile) {
      qb.andWhere('dr.visibleToParents = true');
    }

    if (filters.dateFrom) {
      qb.andWhere('dr.date >= :dateFrom', { dateFrom: filters.dateFrom });
    }

    if (filters.dateTo) {
      qb.andWhere('dr.date <= :dateTo', { dateTo: filters.dateTo });
    }

    if (filters.activityId) {
      qb.andWhere('activity.id = :activityId', {
        activityId: filters.activityId,
      });
    }

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const [data, count] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    const pages = Math.ceil(count / limit);

    return {
      items: data.map((r) => this.serialize(r)),
      count,
      pages,
      page,
      limit,
      previousPage: page > 1 ? page - 1 : null,
      nextPage: page < pages ? page + 1 : null,
    };
  }

  async findOne(id: string, school: School): Promise<DailyReportSerializer> {
    // School scoped via WHERE — not via post-load comparison.
    const report = await this.reportRepository.findOne({
      where: { id, school: { pkid: school.pkid } },
      relations: ['activity', 'student'],
    });
    if (!report) throw new NotFoundException(DAILY_REPORT_NOT_FOUND);

    return this.serialize(report);
  }

  async update(
    id: string,
    dto: UpdateDailyReportDto,
    school: School,
    user: User,
  ): Promise<DailyReportSerializer> {
    const report = await this.reportRepository.findOne({
      where: { id, school: { pkid: school.pkid } },
      relations: ['activity', 'student'],
    });
    if (!report) throw new NotFoundException(DAILY_REPORT_NOT_FOUND);

    if (dto.rawValue) {
      this.validateRawValue(dto.rawValue, report.activity);
      report.rawValue = dto.rawValue;
      report.normalisedScore = this.normalisationService.normalise(
        dto.rawValue,
        report.activity.gradingType,
        report.activity.gradingConfig,
      );
    }

    if (dto.comments !== undefined) report.comments = dto.comments;
    if (dto.mediaId !== undefined) report.mediaId = dto.mediaId;
    if (dto.mediaPreviewUrl !== undefined) {
      report.mediaPreviewUrl = dto.mediaPreviewUrl;
    }
    if (dto.visibleToParents !== undefined) {
      report.visibleToParents = dto.visibleToParents;
    }
    report.updatedBy = user;

    const saved = await this.reportRepository.save(report);
    return this.serialize(saved);
  }

  async remove(id: string, school: School): Promise<void> {
    const report = await this.reportRepository.findOne({
      where: { id, school: { pkid: school.pkid } },
    });
    if (!report) throw new NotFoundException(DAILY_REPORT_NOT_FOUND);

    await this.reportRepository.remove(report);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Load activity and student, both verified to belong to the requesting school
   * via the WHERE clause — no post-load comparison needed.
   */
  private async resolveAndValidate(
    activityId: string,
    studentId: string,
    school: School,
  ) {
    const [activity, student] = await Promise.all([
      this.activityRepository.findOne({
        where: { id: activityId, school: { pkid: school.pkid } },
      }),
      this.studentRepository.findOne({
        where: { id: studentId, school: { pkid: school.pkid } },
      }),
    ]);

    if (!activity) throw new NotFoundException(ACTIVITY_NOT_FOUND);
    if (!student) throw new NotFoundException(STUDENT_NOT_FOUND);

    return { activity, student };
  }

  /**
   * Validate rawValue against the activity's gradingType and gradingConfig.
   * Throws BadRequestException with a descriptive message on failure.
   */
  private validateRawValue(rawValue: string, activity: Activity): void {
    const { gradingType, gradingConfig } = activity;

    switch (gradingType) {
      case EGradingType.RUBRIC: {
        const valid = [
          'MASTERED',
          'PRACTICING',
          'INTRODUCED',
          'NOT_INTRODUCED',
          'A',
          'B',
          'C',
          'D',
          'E',
          'F',
        ];
        if (!valid.includes(rawValue.toUpperCase().trim())) {
          throw new BadRequestException(
            `${INVALID_RAW_VALUE}: expected one of ${valid.join(', ')}`,
          );
        }
        break;
      }

      case EGradingType.NUMERIC: {
        const num = parseFloat(rawValue);
        if (!isFinite(num)) {
          throw new BadRequestException(
            `${INVALID_RAW_VALUE}: expected a number`,
          );
        }
        const cfg = gradingConfig as NumericGradingConfig;
        if (cfg) {
          if (num < cfg.min || num > cfg.max) {
            throw new BadRequestException(
              `${NUMERIC_VALUE_OUT_OF_RANGE}: must be between ${cfg.min} and ${cfg.max}`,
            );
          }
        }
        break;
      }

      case EGradingType.YES_NO: {
        const valid = ['yes', 'no', 'true', 'false', '1', '0'];
        if (!valid.includes(rawValue.toLowerCase().trim())) {
          throw new BadRequestException(
            `${INVALID_RAW_VALUE}: expected one of ${valid.join(', ')}`,
          );
        }
        break;
      }

      case EGradingType.FREQUENCY: {
        const count = parseInt(rawValue, 10);
        if (
          !isFinite(count) ||
          count < 0 ||
          String(count) !== rawValue.trim()
        ) {
          throw new BadRequestException(
            `${INVALID_RAW_VALUE}: expected a non-negative integer`,
          );
        }
        const cfg = gradingConfig as FrequencyGradingConfig;
        if (cfg && count > cfg.maxFrequency) {
          throw new BadRequestException(
            `${FREQUENCY_VALUE_OUT_OF_RANGE}: maximum is ${cfg.maxFrequency}`,
          );
        }
        break;
      }
    }
  }

  /**
   * Upsert a single DailyReport.
   * If a record already exists for (student, activity, date) it is updated.
   * Otherwise a new record is inserted.
   */
  private async upsertReport(params: {
    school: School;
    student: Student;
    activity: Activity;
    date: string;
    rawValue: string;
    normalisedScore: number;
    comments?: string;
    mediaId?: string;
    mediaPreviewUrl?: string;
    user: User;
    repo?: Repository<DailyReport>;
  }): Promise<DailyReport> {
    const repo = params.repo ?? this.reportRepository;

    const existing = await repo.findOne({
      where: {
        student: { pkid: params.student.pkid },
        activity: { pkid: params.activity.pkid },
        date: params.date as unknown as Date,
      },
      relations: ['activity', 'student'],
    });

    if (existing) {
      existing.rawValue = params.rawValue;
      existing.normalisedScore = params.normalisedScore;
      if (params.comments !== undefined) existing.comments = params.comments;
      if (params.mediaId !== undefined) existing.mediaId = params.mediaId;
      if (params.mediaPreviewUrl !== undefined) {
        existing.mediaPreviewUrl = params.mediaPreviewUrl;
      }
      existing.updatedBy = params.user;
      return repo.save(existing);
    }

    const report = repo.create({
      school: params.school,
      student: params.student,
      activity: params.activity,
      date: params.date as unknown as Date,
      rawValue: params.rawValue,
      normalisedScore: params.normalisedScore,
      comments: params.comments,
      mediaId: params.mediaId,
      mediaPreviewUrl: params.mediaPreviewUrl,
      createdBy: params.user,
    });

    return repo.save(report);
  }

  /** Process one item in a batch, returning a result entry (never throws). */
  private async processBatchItem(
    obs: BatchObservationItemDto,
    activity: Activity,
    studentMap: Map<string, Student>,
    date: string,
    school: School,
    user: User,
    repo: Repository<DailyReport>,
  ): Promise<BatchResultItemSerializer> {
    const student = studentMap.get(obs.studentId);

    if (!student) {
      return {
        studentId: obs.studentId,
        success: false,
        error: STUDENT_NOT_FOUND,
      };
    }

    try {
      this.validateRawValue(obs.rawValue, activity);

      const normalisedScore = this.normalisationService.normalise(
        obs.rawValue,
        activity.gradingType,
        activity.gradingConfig,
      );

      const report = await this.upsertReport({
        school,
        student,
        activity,
        date,
        rawValue: obs.rawValue,
        normalisedScore,
        comments: obs.comments,
        mediaId: obs.mediaId,
        mediaPreviewUrl: obs.mediaPreviewUrl,
        user,
        repo,
      });

      return {
        studentId: obs.studentId,
        success: true,
        report: this.serialize(report),
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error';
      return { studentId: obs.studentId, success: false, error: message };
    }
  }

  private serialize(report: DailyReport): DailyReportSerializer {
    return plainToInstance(DailyReportSerializer, report, {
      excludeExtraneousValues: true,
    });
  }
}
