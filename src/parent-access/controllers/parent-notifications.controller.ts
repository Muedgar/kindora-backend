import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
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
import { ResponseMessage } from 'src/common/decorators';
import { User } from 'src/users/entities';
import { SchoolContext } from 'src/auth/interfaces/school-context.interface';
import {
  PARENT_NOTIFICATION_MARKED_READ,
  PARENT_NOTIFICATIONS_FETCHED,
  PARENT_NOTIFICATIONS_MARKED_ALL_READ,
} from 'src/reports/messages/success';
import { ParentNotificationQueryDto } from '../dto/parent-notification-query.dto';
import { ParentNotificationsService } from '../services/parent-notifications.service';

@ApiTags('Parent Access')
@ApiBearerAuth()
@Controller('parent')
@UseGuards(JwtAuthGuard, SchoolContextGuard, PermissionGuard, ParentGuard)
export class ParentNotificationsController {
  constructor(
    private readonly parentNotificationsService: ParentNotificationsService,
  ) {}

  @Get('notifications')
  @ApiOperation({ summary: 'List parent notifications' })
  @ResponseMessage(PARENT_NOTIFICATIONS_FETCHED)
  @RequirePermission('read:notifications')
  list(
    @GetUser() user: User,
    @GetSchoolContext() ctx: SchoolContext,
    @Query() query: ParentNotificationQueryDto,
  ) {
    return this.parentNotificationsService.list(user, ctx.school, query);
  }

  @Patch('notifications/:id/read')
  @ApiOperation({ summary: 'Mark one parent notification as read' })
  @ResponseMessage(PARENT_NOTIFICATION_MARKED_READ)
  @RequirePermission('read:notifications')
  markRead(
    @GetUser() user: User,
    @GetSchoolContext() ctx: SchoolContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.parentNotificationsService.markRead(user, ctx.school, id);
  }

  @Patch('notifications/read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all parent notifications as read' })
  @ResponseMessage(PARENT_NOTIFICATIONS_MARKED_ALL_READ)
  @RequirePermission('read:notifications')
  markAllRead(@GetUser() user: User, @GetSchoolContext() ctx: SchoolContext) {
    return this.parentNotificationsService.markAllRead(user, ctx.school);
  }
}
