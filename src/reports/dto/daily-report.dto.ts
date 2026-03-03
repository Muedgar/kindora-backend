import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Single observation — one student, one activity, one day.
 */
export class CreateDailyReportDto {
  /** ISO date string: "2026-03-02" */
  @IsDateString()
  date: string;

  @IsUUID('4')
  activityId: string;

  @IsUUID('4')
  studentId: string;

  /**
   * Grade value. Format depends on the activity's gradingType:
   *   RUBRIC    → "MASTERED" | "PRACTICING" | "INTRODUCED" | "NOT_INTRODUCED" | "A"–"F"
   *   NUMERIC   → numeric string within gradingConfig bounds
   *   YES_NO    → "yes" | "no" | "true" | "false" | "1" | "0"
   *   FREQUENCY → non-negative integer string
   */
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  rawValue: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comments?: string;
}

/** Patch DTO — rawValue, comments, and parent visibility can be changed. */
export class UpdateDailyReportDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  rawValue?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comments?: string;

  /**
   * Set to false to hide this observation from the parent timeline feed.
   * Useful for sensitive notes (medical, behavioural incidents) that
   * should be discussed in person.
   */
  @IsOptional()
  @IsBoolean()
  visibleToParents?: boolean;
}

/**
 * One student entry inside a batch submission.
 */
export class BatchObservationItemDto {
  @IsUUID('4')
  studentId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  rawValue: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comments?: string;
}

/**
 * Batch submission — one activity, one day, many students.
 *
 * Designed for the staff mobile app "record whole class" flow.
 * Each observation is upserted independently: if a record already exists
 * for (student, activity, date) it is updated; otherwise a new one is created.
 * Observations with invalid rawValue are skipped and returned in the response
 * as errors so the rest of the batch is not blocked.
 */
export class CreateBatchDailyReportDto {
  /** ISO date string: "2026-03-02" */
  @IsDateString()
  date: string;

  @IsUUID('4')
  activityId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchObservationItemDto)
  observations: BatchObservationItemDto[];
}
