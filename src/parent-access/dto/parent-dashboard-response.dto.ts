import { ApiProperty } from '@nestjs/swagger';
import { ETrend } from 'src/reports/enums/snapshot.enum';

export class ParentDashboardAreaDto {
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

  @ApiProperty()
  activityName: string;

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
  @ApiProperty({ nullable: true })
  overall: number | null;

  @ApiProperty({ type: [ParentDashboardAreaDto] })
  areas: ParentDashboardAreaDto[];

  @ApiProperty({ type: [ParentDashboardActivityDto] })
  activities: ParentDashboardActivityDto[];

  @ApiProperty({ type: String, format: 'date-time' })
  lastUpdated: string;
}
