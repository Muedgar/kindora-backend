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
import { JwtAuthGuard, PermissionGuard, SchoolContextGuard } from 'src/auth/guards';
import { GetSchoolContext } from 'src/auth/decorators';
import { GetUser } from 'src/auth/decorators';
import { RequirePermission } from 'src/auth/decorators';
import { LogActivity, ResponseMessage } from 'src/common/decorators';
import { ListFilterDTO } from 'src/common/dtos';
import { SchoolContext } from 'src/auth/interfaces/school-context.interface';
import { User } from 'src/users/entities';
import { LearningAreaService } from '../services/learning-area.service';
import { CreateLearningAreaDto, UpdateLearningAreaDto } from '../dto/learning-area.dto';
import {
  LEARNING_AREA_CREATED,
  LEARNING_AREA_DELETED,
  LEARNING_AREA_FETCHED,
  LEARNING_AREA_RETRIEVED,
  LEARNING_AREA_UPDATED,
} from '../messages';

@ApiTags('Learning Areas')
@Controller('learning-area')
@UseGuards(JwtAuthGuard, SchoolContextGuard, PermissionGuard)
export class LearningAreaController {
  constructor(private readonly learningAreaService: LearningAreaService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new learning area for the school' })
  @ResponseMessage(LEARNING_AREA_CREATED)
  @RequirePermission('write:learning-area')
  @LogActivity({
    action: 'create:learning-area',
    resource: 'learning-area',
    includeBody: true,
  })
  create(
    @Body() dto: CreateLearningAreaDto,
    @GetSchoolContext() ctx: SchoolContext,
    @GetUser() user: User,
  ) {
    return this.learningAreaService.create(dto, ctx.school, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all learning areas for the school (paginated)' })
  @ResponseMessage(LEARNING_AREA_FETCHED)
  @RequirePermission('read:learning-area')
  findAll(
    @Query() filters: ListFilterDTO,
    @GetSchoolContext() ctx: SchoolContext,
  ) {
    return this.learningAreaService.findAll(ctx.school, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single learning area with its activities' })
  @ResponseMessage(LEARNING_AREA_RETRIEVED)
  @RequirePermission('read:learning-area')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolContext() ctx: SchoolContext,
  ) {
    return this.learningAreaService.findOne(id, ctx.school);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a learning area name, description, or activities' })
  @ResponseMessage(LEARNING_AREA_UPDATED)
  @RequirePermission('write:learning-area')
  @LogActivity({
    action: 'update:learning-area',
    resource: 'learning-area',
    includeBody: true,
  })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLearningAreaDto,
    @GetSchoolContext() ctx: SchoolContext,
  ) {
    return this.learningAreaService.update(id, dto, ctx.school);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a learning area (no active reports may reference it)' })
  @ResponseMessage(LEARNING_AREA_DELETED)
  @RequirePermission('write:learning-area')
  @LogActivity({
    action: 'delete:learning-area',
    resource: 'learning-area',
  })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetSchoolContext() ctx: SchoolContext,
  ) {
    return this.learningAreaService.remove(id, ctx.school);
  }
}
