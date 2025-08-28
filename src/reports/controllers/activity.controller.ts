import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators';
import { ListFilterDTO } from 'src/common/dtos';
import { ACTIVITY_CREATED, ACTIVITY_FETCHED } from '../messages';
import { JwtAuthGuard } from 'src/auth/guards';
import { User } from 'src/users/entities';
import { GetUser } from 'src/auth/decorators';
import { ActivityService } from '../services/activity.service';
import { CreateActivityDto } from '../dto/activity.dto';

@ApiTags('Activity')
@Controller('activity')
@UseGuards(JwtAuthGuard)
export class ActivityController {
  constructor(private activityService: ActivityService) {}

  @Post('create')
  @ApiOperation({ summary: 'create a new activity' })
  @ResponseMessage(ACTIVITY_CREATED)
  createActivity(
    @Body() createActivityDto: CreateActivityDto,
    @GetUser() user: User,
  ) {
    const userId = user.id;
    return this.activityService.createActivity(createActivityDto, userId);
  }

  @Get('')
  @ApiOperation({ summary: 'Get activities' })
  @ResponseMessage(ACTIVITY_FETCHED)
  async getActivities(@Query() listFilerDTO: ListFilterDTO) {
    return this.activityService.findAll(listFilerDTO);
  }
}
