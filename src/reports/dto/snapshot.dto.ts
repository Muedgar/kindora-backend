import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ListFilterDTO } from 'src/common/dtos';
import { EReportType, ESnapshotStatus } from '../enums/snapshot.enum';

// ── Generation ────────────────────────────────────────────────────────────────

export class GenerateSnapshotDto {
  @ApiProperty({ enum: EReportType, example: EReportType.WEEKLY })
  @IsEnum(EReportType)
  type: EReportType;

  @ApiProperty({ description: 'Student UUID' })
  @IsUUID('4')
  studentId: string;

  @ApiProperty({ example: '2026-02-23' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ example: '2026-03-01' })
  @IsDateString()
  periodEnd: string;
}

export class GenerateBulkSnapshotDto {
  @ApiProperty({ enum: EReportType, example: EReportType.WEEKLY })
  @IsEnum(EReportType)
  type: EReportType;

  @ApiProperty({ example: '2026-02-23' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ example: '2026-03-01' })
  @IsDateString()
  periodEnd: string;
}

// ── Review workflow ───────────────────────────────────────────────────────────

export class ReviewSnapshotDto {
  @ApiProperty({
    description: 'Teacher narrative — shown to parents after publishing',
    example:
      'Amara had a fantastic week! She is showing great progress in language activities and her social skills continue to shine.',
  })
  @IsString()
  @MaxLength(2000)
  teacherNotes: string;
}

// ── Filtering ─────────────────────────────────────────────────────────────────

export class SnapshotFilterDto extends ListFilterDTO {
  @ApiProperty({ enum: EReportType, required: false })
  @IsOptional()
  @IsEnum(EReportType)
  type?: EReportType;

  @ApiProperty({ enum: ESnapshotStatus, required: false })
  @IsOptional()
  @IsEnum(ESnapshotStatus)
  status?: ESnapshotStatus;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUUID('4')
  studentId?: string;

  @ApiProperty({ required: false, example: '2026-01-06' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiProperty({ required: false, example: '2026-03-28' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

/** Admin UC4 operational summary — both dates required. */
export class AdminSummaryFilterDto {
  @ApiProperty({ example: '2026-02-23' })
  @IsDateString()
  dateFrom: string;

  @ApiProperty({ example: '2026-03-01' })
  @IsDateString()
  dateTo: string;
}

/**
 * Query params for the student trends (development dashboard) endpoint.
 *
 *   GET /report-snapshot/student/:id/trends?type=WEEKLY&weeks=12
 *
 * Returns chart-ready time-series data: one entry per snapshot period,
 * each with overall score and per-learning-area breakdown.
 */
export class StudentTrendsFilterDto {
  @ApiProperty({ enum: EReportType, required: false, default: EReportType.WEEKLY })
  @IsOptional()
  @IsEnum(EReportType)
  type?: EReportType;

  @ApiProperty({
    required: false,
    description: 'Look-back window in weeks (default 12, max 52)',
    default: 12,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value as string, 10))
  @IsInt()
  @Min(1)
  @Max(52)
  weeks?: number = 12;
}
