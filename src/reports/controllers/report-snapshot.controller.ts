import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { LogActivity, ResponseMessage } from 'src/common/decorators';
import {
  JwtAuthGuard,
  PermissionGuard,
  SchoolContextGuard,
} from 'src/auth/guards';
import {
  GetSchoolContext,
  GetUser,
  RequirePermission,
} from 'src/auth/decorators';
import { User } from 'src/users/entities';
import { SchoolContext } from 'src/auth/interfaces/school-context.interface';

import { ReportSnapshotService } from '../services/report-snapshot.service';
import {
  GenerateSnapshotDto,
  GenerateBulkSnapshotDto,
  ReviewSnapshotDto,
  SnapshotFilterDto,
  AdminSummaryFilterDto,
  StudentTrendsFilterDto,
} from '../dto/snapshot.dto';
import {
  SNAPSHOT_GENERATED,
  SNAPSHOT_BULK_GENERATED,
  SNAPSHOTS_FETCHED,
  SNAPSHOT_RETRIEVED,
  SNAPSHOT_REVIEWED,
  SNAPSHOT_PUBLISHED,
  ADMIN_SUMMARY_FETCHED,
} from '../messages/success';

@ApiTags('Report Snapshots')
@Controller('report-snapshot')
@UseGuards(JwtAuthGuard, SchoolContextGuard, PermissionGuard)
export class ReportSnapshotController {
  constructor(private readonly snapshotService: ReportSnapshotService) {}

  // ── Generation ─────────────────────────────────────────────────────────────

  @Post('generate')
  @ApiOperation({ summary: 'Manually generate a snapshot for one student.' })
  @ResponseMessage(SNAPSHOT_GENERATED)
  @RequirePermission('write:report-snapshot')
  @LogActivity({ action: 'generate:report-snapshot', resource: 'report-snapshot', includeBody: true })
  generateOne(
    @Body() dto: GenerateSnapshotDto,
    @GetSchoolContext() ctx: SchoolContext,
    @GetUser() user: User,
  ) {
    return this.snapshotService.generateOne(dto, ctx.school, user);
  }

  @Post('generate-bulk')
  @ApiOperation({ summary: 'Generate snapshots for all students in the school.' })
  @ResponseMessage(SNAPSHOT_BULK_GENERATED)
  @RequirePermission('write:report-snapshot')
  @LogActivity({ action: 'bulk-generate:report-snapshot', resource: 'report-snapshot', includeBody: true })
  generateBulk(
    @Body() dto: GenerateBulkSnapshotDto,
    @GetSchoolContext() ctx: SchoolContext,
    @GetUser() user: User,
  ) {
    return this.snapshotService.generateBulk(dto, ctx.school, user);
  }

  // ── Listing & detail ───────────────────────────────────────────────────────

  @Get()
  @ApiOperation({
    summary:
      'List snapshots. Parents see only PUBLISHED snapshots for their children; ' +
      'staff see all statuses.',
  })
  @ResponseMessage(SNAPSHOTS_FETCHED)
  @RequirePermission('write:report-snapshot')
  findAll(
    @Query() filters: SnapshotFilterDto,
    @GetSchoolContext() ctx: SchoolContext,
    @GetUser() user: User,
  ) {
    return this.snapshotService.findAll(filters, ctx.school, user);
  }

  // ── Static-segment routes before /:id ─────────────────────────────────────

  @Get('admin/summary')
  @ApiOperation({ summary: 'Live operational summary: coverage, learning area breakdown, no-activity students.' })
  @ResponseMessage(ADMIN_SUMMARY_FETCHED)
  @RequirePermission('write:report-snapshot')
  getAdminSummary(
    @Query() filters: AdminSummaryFilterDto,
    @GetSchoolContext() ctx: SchoolContext,
  ) {
    return this.snapshotService.getAdminWeeklySummary(filters, ctx.school);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Count of unread PUBLISHED snapshots for the calling parent.' })
  @RequirePermission('write:report-snapshot')
  getUnreadCount(
    @GetSchoolContext() ctx: SchoolContext,
    @GetUser() user: User,
  ) {
    return this.snapshotService.getUnreadCount(ctx.school, user);
  }

  @Get('student/:studentId')
  @ApiOperation({ summary: "Student snapshot history. Guardian-scoped for parents." })
  @ResponseMessage(SNAPSHOTS_FETCHED)
  @RequirePermission('write:report-snapshot')
  findByStudent(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query() filters: SnapshotFilterDto,
    @GetSchoolContext() ctx: SchoolContext,
    @GetUser() user: User,
  ) {
    return this.snapshotService.findByStudent(studentId, filters, ctx.school, user);
  }

  @Get('student/:studentId/trends')
  @ApiOperation({
    summary:
      'Chart-ready time-series data for the parent development dashboard. ' +
      'One entry per snapshot period with overall score and per-learning-area averages.',
  })
  @RequirePermission('write:report-snapshot')
  getStudentTrends(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query() filters: StudentTrendsFilterDto,
    @GetSchoolContext() ctx: SchoolContext,
    @GetUser() user: User,
  ) {
    return this.snapshotService.getStudentTrends(studentId, filters, ctx.school, user);
  }

  // ── Single snapshot ────────────────────────────────────────────────────────

  @Get(':id')
  @ApiOperation({ summary: 'Full snapshot with activity breakdown. Parents: PUBLISHED + guardian-scoped.' })
  @ResponseMessage(SNAPSHOT_RETRIEVED)
  @RequirePermission('write:report-snapshot')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolContext() ctx: SchoolContext,
    @GetUser() user: User,
  ) {
    return this.snapshotService.findOne(id, ctx.school, user);
  }

  // ── Read receipts ──────────────────────────────────────────────────────────

  @Post(':id/mark-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a published snapshot as read (parent only, idempotent).' })
  @RequirePermission('write:report-snapshot')
  markAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolContext() ctx: SchoolContext,
    @GetUser() user: User,
  ) {
    return this.snapshotService.markAsRead(id, ctx.school, user);
  }

  // ── Teacher review workflow ────────────────────────────────────────────────

  @Patch(':id/review')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add teacher notes → PENDING_REVIEW.' })
  @ResponseMessage(SNAPSHOT_REVIEWED)
  @RequirePermission('write:report-snapshot')
  @LogActivity({ action: 'review:report-snapshot', resource: 'report-snapshot', includeBody: true })
  review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewSnapshotDto,
    @GetSchoolContext() ctx: SchoolContext,
    @GetUser() user: User,
  ) {
    return this.snapshotService.review(id, dto, user, ctx.school);
  }

  @Patch(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Publish → visible to parents. Emits push notification event.' })
  @ResponseMessage(SNAPSHOT_PUBLISHED)
  @RequirePermission('publish:report-snapshot')
  @LogActivity({ action: 'publish:report-snapshot', resource: 'report-snapshot' })
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolContext() ctx: SchoolContext,
    @GetUser() user: User,
  ) {
    return this.snapshotService.publish(id, user, ctx.school);
  }
}
