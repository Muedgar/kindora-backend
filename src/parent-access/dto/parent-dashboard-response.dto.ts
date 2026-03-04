import { ApiProperty } from '@nestjs/swagger';
import { ETrend } from 'src/reports/enums/snapshot.enum';

export class ParentDashboardAreaDto {
  @ApiProperty({ nullable: true })
  areaId: string | null;

  @ApiProperty()
  areaName: string;

  @ApiProperty({ nullable: true })
  score: number | null;

  @ApiProperty({ enum: ETrend, nullable: true })
  trend: ETrend | null;

  @ApiProperty()
  color: string;
}

export class ParentDashboardActivityDto {
  @ApiProperty()
  activityId: string;

  @ApiProperty({ deprecated: true })
  activityName: string;

  @ApiProperty()
  name: string;

  @ApiProperty({ nullable: true })
  areaName: string | null;

  @ApiProperty({ nullable: true })
  averageScore: number | null;

  @ApiProperty({ enum: ETrend, nullable: true })
  trend: ETrend | null;

  @ApiProperty({ type: [Number] })
  sparkline: number[];
}

export class ParentDashboardResponseDto {
  @ApiProperty({ nullable: true, deprecated: true })
  overall: number | null;

  @ApiProperty({ nullable: true })
  overallScore: number | null;

  @ApiProperty({ type: [ParentDashboardAreaDto], deprecated: true })
  areas: ParentDashboardAreaDto[];

  @ApiProperty({ type: [ParentDashboardAreaDto] })
  learningAreas: ParentDashboardAreaDto[];

  @ApiProperty({ type: [ParentDashboardActivityDto] })
  activities: ParentDashboardActivityDto[];

  @ApiProperty({ type: String, format: 'date-time' })
  lastUpdated: string;
}
