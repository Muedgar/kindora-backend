import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  GetSchoolContext,
  GetUser,
  RequirePermission,
} from 'src/auth/decorators';
import {
  JwtAuthGuard,
  ParentGuard,
  PermissionGuard,
  SchoolContextGuard,
} from 'src/auth/guards';
import { SchoolContext } from 'src/auth/interfaces/school-context.interface';
import { ResponseMessage } from 'src/common/decorators';
import { User } from 'src/users/entities';
import { SnapshotFilterDto } from 'src/reports/dto/snapshot.dto';
import { SNAPSHOTS_FETCHED, SNAPSHOT_RETRIEVED } from 'src/reports/messages/success';
import { ParentReportsService } from '../services/parent-reports.service';

@ApiTags('Parent Access')
@ApiBearerAuth()
@Controller('parent')
@UseGuards(JwtAuthGuard, SchoolContextGuard, PermissionGuard, ParentGuard)
export class ParentReportsController {
  constructor(private readonly parentReportsService: ParentReportsService) {}

  @Get('reports')
  @ApiOperation({ summary: 'Parent report inbox' })
  @ResponseMessage(SNAPSHOTS_FETCHED)
  @RequirePermission('read:report-snapshot')
  getReports(
    @Query() filters: SnapshotFilterDto,
    @GetSchoolContext() ctx: SchoolContext,
    @GetUser() user: User,
  ) {
    return this.parentReportsService.getReports(filters, ctx.school, user);
  }

  @Get('reports/:id')
  @ApiOperation({ summary: 'Parent report detail' })
  @ResponseMessage(SNAPSHOT_RETRIEVED)
  @RequirePermission('read:report-snapshot')
  getReportById(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolContext() ctx: SchoolContext,
    @GetUser() user: User,
  ) {
    return this.parentReportsService.getReportById(id, ctx.school, user);
  }
}
