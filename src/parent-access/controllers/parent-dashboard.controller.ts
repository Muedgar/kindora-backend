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
import { StudentTrendsFilterDto } from 'src/reports/dto/snapshot.dto';
import { PARENT_DASHBOARD_FETCHED } from 'src/reports/messages/success';
import { ParentDashboardService } from '../services/parent-dashboard.service';

@ApiTags('Parent Access')
@ApiBearerAuth()
@Controller('parent')
@UseGuards(JwtAuthGuard, SchoolContextGuard, PermissionGuard, ParentGuard)
export class ParentDashboardController {
  constructor(private readonly parentDashboardService: ParentDashboardService) {}

  @Get('dashboard/:studentId')
  @ApiOperation({ summary: 'Parent dashboard data for one child' })
  @ResponseMessage(PARENT_DASHBOARD_FETCHED)
  @RequirePermission('read:report-snapshot')
  getDashboard(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query() filters: StudentTrendsFilterDto,
    @GetSchoolContext() ctx: SchoolContext,
    @GetUser() user: User,
  ) {
    return this.parentDashboardService.getDashboard(studentId, filters, ctx.school, user);
  }
}
