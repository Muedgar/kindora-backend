import {
  Body,
  Controller,
  Delete,
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
import { ReportFilterDto } from '../dto/report-filter.dto';
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
import { DailyReportService } from '../services/daily-report.service';
import {
  CreateDailyReportDto,
  CreateBatchDailyReportDto,
  UpdateDailyReportDto,
} from '../dto/daily-report.dto';
import {
  DAILY_REPORT_CREATED,
  DAILY_REPORT_BATCH_CREATED,
  DAILY_REPORT_FETCHED,
  DAILY_REPORT_RETRIEVED,
  DAILY_REPORT_UPDATED,
  DAILY_REPORT_DELETED,
  STUDENT_TIMELINE_FETCHED,
} from '../messages/success';

@ApiTags('Daily Reports')
@Controller('daily-report')
@UseGuards(JwtAuthGuard, SchoolContextGuard, PermissionGuard)
export class DailyReportController {
  constructor(private readonly dailyReportService: DailyReportService) {}

  // ── Single observation ────────────────────────────────────────────────────

  @Post()
  @ApiOperation({
    summary: 'Record a single observation for one student on one activity',
  })
  @ResponseMessage(DAILY_REPORT_CREATED)
  @RequirePermission('write:daily-report')
  @LogActivity({
    action: 'create:daily-report',
    resource: 'daily-report',
    includeBody: true,
  })
  createSingle(
    @Body() dto: CreateDailyReportDto,
    @GetSchoolContext() ctx: SchoolContext,
    @GetUser() user: User,
  ) {
    return this.dailyReportService.createSingle(dto, ctx.school, user);
  }

  // ── Batch observations (staff mobile: whole-class recording) ──────────────

  @Post('batch')
  @ApiOperation({
    summary:
      'Record observations for multiple students on one activity in a single request. ' +
      'Each observation is upserted independently; per-item errors are returned ' +
      'without blocking the rest of the batch.',
  })
  @ResponseMessage(DAILY_REPORT_BATCH_CREATED)
  @RequirePermission('write:daily-report')
  @LogActivity({
    action: 'batch:daily-report',
    resource: 'daily-report',
    includeBody: true,
  })
  createBatch(
    @Body() dto: CreateBatchDailyReportDto,
    @GetSchoolContext() ctx: SchoolContext,
    @GetUser() user: User,
  ) {
    return this.dailyReportService.createBatch(dto, ctx.school, user);
  }

  // ── List & detail ─────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'List all observations for the school (paginated)' })
  @ResponseMessage(DAILY_REPORT_FETCHED)
  @RequirePermission('write:daily-report')
  findAll(
    @Query() filters: ReportFilterDto,
    @GetSchoolContext() ctx: SchoolContext,
  ) {
    return this.dailyReportService.findAll(filters, ctx.school);
  }

  /**
   * Student timeline — all observations for a specific student, sorted by date desc.
   * Intended for both staff (review) and parent (progress view, Phase 3).
   * Route must be declared before /:id to avoid ParseUUIDPipe clash.
   *
   * Guardian-scoping: if the caller has a Parent profile in this school,
   * the service enforces that they have a StudentGuardian record for this student.
   */
  @Get('student/:studentId')
  @ApiOperation({
    summary: "Fetch a student's full observation timeline (paginated)",
  })
  @ResponseMessage(STUDENT_TIMELINE_FETCHED)
  @RequirePermission('write:daily-report')
  getStudentTimeline(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query() filters: ReportFilterDto,
    @GetSchoolContext() ctx: SchoolContext,
    @GetUser() user: User,
  ) {
    return this.dailyReportService.findByStudent(
      studentId,
      filters,
      ctx.school,
      user,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single observation by ID' })
  @ResponseMessage(DAILY_REPORT_RETRIEVED)
  @RequirePermission('write:daily-report')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolContext() ctx: SchoolContext,
  ) {
    return this.dailyReportService.findOne(id, ctx.school);
  }

  // ── Mutation ──────────────────────────────────────────────────────────────

  @Patch(':id')
  @ApiOperation({ summary: 'Correct rawValue or comments on an observation' })
  @ResponseMessage(DAILY_REPORT_UPDATED)
  @RequirePermission('write:daily-report')
  @LogActivity({
    action: 'update:daily-report',
    resource: 'daily-report',
    includeBody: true,
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDailyReportDto,
    @GetSchoolContext() ctx: SchoolContext,
    @GetUser() user: User,
  ) {
    return this.dailyReportService.update(id, dto, ctx.school, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an observation' })
  @RequirePermission('write:daily-report')
  @LogActivity({ action: 'delete:daily-report', resource: 'daily-report' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolContext() ctx: SchoolContext,
  ) {
    return this.dailyReportService.remove(id, ctx.school);
  }
}
