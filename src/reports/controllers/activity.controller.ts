import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { LogActivity, ResponseMessage } from 'src/common/decorators';
import { ListFilterDTO } from 'src/common/dtos';
import { ACTIVITY_CREATED, ACTIVITY_FETCHED } from '../messages';
import {
  JwtAuthGuard,
  PermissionGuard,
  SchoolContextGuard,
} from 'src/auth/guards';
import { GetSchoolContext, GetUser, RequirePermission } from 'src/auth/decorators';
import { User } from 'src/users/entities';
import { SchoolContext } from 'src/auth/interfaces/school-context.interface';
import { ActivityService } from '../services/activity.service';
import { CreateActivityDto } from '../dto/activity.dto';

@ApiTags('Activities')
@Controller('activity')
@UseGuards(JwtAuthGuard, SchoolContextGuard, PermissionGuard)
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new activity for the school' })
  @ResponseMessage(ACTIVITY_CREATED)
  @RequirePermission('write:activity')
  @LogActivity({
    action: 'create:activity',
    resource: 'activity',
    includeBody: true,
  })
  createActivity(
    @Body() dto: CreateActivityDto,
    @GetSchoolContext() ctx: SchoolContext,
    @GetUser() user: User,
  ) {
    return this.activityService.createActivity(dto, ctx.school, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List activities for the school (paginated)' })
  @ResponseMessage(ACTIVITY_FETCHED)
  @RequirePermission('read:activity')
  findAll(
    @Query() filters: ListFilterDTO,
    @GetSchoolContext() ctx: SchoolContext,
  ) {
    return this.activityService.findAll(ctx.school, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single activity with grading levels' })
  @ResponseMessage(ACTIVITY_FETCHED)
  @RequirePermission('read:activity')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolContext() ctx: SchoolContext,
  ) {
    return this.activityService.findOne(id, ctx.school);
  }
}
