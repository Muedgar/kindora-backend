import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators';
import { ListFilterDTO } from 'src/common/dtos';
import { TEMPLATE_CREATED, TEMPLATE_FETCHED } from '../messages';
import { JwtAuthGuard, PermissionGuard, SchoolContextGuard } from 'src/auth/guards';
import { User } from 'src/users/entities';
import { GetUser, RequirePermission } from 'src/auth/decorators';
import { ActivityTemplateService } from '../services/activity-template.service';
import { CreateActivitiesTemplateDto } from '../dto/create-activity-template.dto';

@ApiTags('Activities Template')
@Controller('activity-template')
@UseGuards(JwtAuthGuard, SchoolContextGuard, PermissionGuard)
export class ActivitiesTemplateController {
  constructor(private activityTemplateService: ActivityTemplateService) {}

  @Post('create')
  @ApiOperation({ summary: 'create a new activity template' })
  @ResponseMessage(TEMPLATE_CREATED)
  @RequirePermission('write:lesson')
  createActivitiesTemplate(
    @Body() createActivityTemplateDto: CreateActivitiesTemplateDto,
    @GetUser() user: User,
  ) {
    const userId = user.id;
    return this.activityTemplateService.createActivitiesTemplate(
      createActivityTemplateDto,
      userId,
    );
  }

  @Get('')
  @ApiOperation({ summary: 'Get activities templates' })
  @ResponseMessage(TEMPLATE_FETCHED)
  @RequirePermission('read:lesson')
  async getActivitiesTemplate(@Query() listFilerDTO: ListFilterDTO) {
    return this.activityTemplateService.findAll(listFilerDTO);
  }
}
