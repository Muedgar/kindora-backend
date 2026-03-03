import { IsDateString, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ListFilterDTO } from 'src/common/dtos';

/**
 * Extended filter DTO for report queries.
 *
 * Adds date-range and activity scoping on top of the base
 * pagination/search fields from ListFilterDTO. Used by:
 *
 *   GET /daily-report                  — school-wide list
 *   GET /daily-report/student/:id      — student timeline
 *
 * Date handling:
 *   dateFrom / dateTo are inclusive ISO date strings ("2026-01-01").
 *   Both are optional. When omitted the query is unbounded on that side.
 *
 * Typical use:
 *   Weekly view   → dateFrom=2026-02-24&dateTo=2026-03-02
 *   Termly view   → dateFrom=2026-01-06&dateTo=2026-03-28
 *   Single day    → dateFrom=2026-03-02&dateTo=2026-03-02
 */
export class ReportFilterDto extends ListFilterDTO {
  @ApiProperty({
    required: false,
    description: 'Inclusive start date — ISO format (YYYY-MM-DD)',
    example: '2026-01-06',
  })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiProperty({
    required: false,
    description: 'Inclusive end date — ISO format (YYYY-MM-DD)',
    example: '2026-03-28',
  })
  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @ApiProperty({
    required: false,
    description: 'Filter by a specific activity UUID',
  })
  @IsOptional()
  @IsUUID('4')
  activityId?: string;
}
