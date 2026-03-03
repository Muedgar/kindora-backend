import { Expose, Transform, Type } from 'class-transformer';
import { BaseSerializer } from 'src/common/serializers';
import { ActivitySerializer } from './activity.serializer';

/** Minimal student projection included in each observation response. */
export class StudentBriefSerializer extends BaseSerializer {
  @Expose()
  fullName: string;

  @Expose()
  gender: string;

  @Expose()
  dateOfBirth: Date;
}

export class DailyReportSerializer extends BaseSerializer {
  @Expose()
  date: Date;

  @Expose()
  rawValue: string;

  /**
   * normalisedScore is stored as DECIMAL in Postgres and TypeORM may return
   * it as a string. We always coerce to a number here.
   */
  @Expose()
  @Transform(({ value }) => (value != null ? parseFloat(value as string) : null))
  normalisedScore: number;

  @Expose()
  comments: string;

  @Expose()
  @Type(() => ActivitySerializer)
  activity: ActivitySerializer;

  @Expose()
  @Type(() => StudentBriefSerializer)
  student: StudentBriefSerializer;

  /** Visible to staff only — parents won't see hidden observations at all. */
  @Expose()
  visibleToParents: boolean;
}

/** Returned from batch create — one entry per student in the request. */
export class BatchResultItemSerializer {
  studentId: string;
  success: boolean;
  report?: DailyReportSerializer;
  error?: string;
}

export class BatchDailyReportSerializer {
  succeeded: number;
  failed: number;
  results: BatchResultItemSerializer[];
}
