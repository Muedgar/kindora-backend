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
import { STUDENT_TIMELINE_FETCHED } from 'src/reports/messages/success';
import { ParentTimelineQueryDto } from '../dto/parent-timeline-query.dto';
import { ParentTimelineService } from '../services/parent-timeline.service';

@ApiTags('Parent Access')
@ApiBearerAuth()
@Controller('parent')
@UseGuards(JwtAuthGuard, SchoolContextGuard, PermissionGuard, ParentGuard)
export class ParentTimelineController {
  constructor(private readonly parentTimelineService: ParentTimelineService) {}

  @Get('timeline/:studentId')
  @ApiOperation({ summary: 'Parent timeline feed for one child' })
  @ResponseMessage(STUDENT_TIMELINE_FETCHED)
  @RequirePermission('read:daily-report')
  getTimeline(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Query() query: ParentTimelineQueryDto,
    @GetSchoolContext() ctx: SchoolContext,
    @GetUser() user: User,
  ) {
    return this.parentTimelineService.getTimeline(studentId, query, ctx.school, user);
  }
}
