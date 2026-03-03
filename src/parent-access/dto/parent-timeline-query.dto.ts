import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class ParentTimelineQueryDto {
  @ApiProperty({
    required: false,
    description: 'Opaque cursor from previous response (format: YYYY-MM-DD::pkid)',
    example: '2026-03-03::1520',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiProperty({
    required: false,
    default: 20,
    description: 'Page size (max 50)',
  })
  @IsOptional()
  @Transform(({ value }) => Math.min(Math.max(Number(value), 1), 50))
  @IsInt()
  @Min(1)
  pageSize?: number = 20;

  @ApiProperty({
    required: false,
    description: 'Optional day pin filter (YYYY-MM-DD)',
    example: '2026-03-03',
  })
  @IsOptional()
  @IsDateString()
  date?: string;
}
