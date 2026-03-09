import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage, LogActivity } from 'src/common/decorators';
import { CLASSROOM_CREATED, CLASSROOM_FETCHED, CLASSROOMS_FETCHED } from './messages';
import { ListFilterDTO } from 'src/common/dtos';
import { ClassroomsService } from './classrooms.service';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { BranchContextGuard, JwtAuthGuard, PermissionGuard } from 'src/auth/guards';
import { CurrentBranch, GetSchoolContext, GetUser, RequirePermission, RequiresBranchAccess } from 'src/auth/decorators';
import { User } from 'src/users/entities';
import { SchoolBranch } from 'src/schools/entities/rwanda/school-branch.entity';
import { SchoolContext } from 'src/auth/interfaces/school-context.interface';

@ApiTags('Classrooms')
@Controller('classrooms')
@UseGuards(JwtAuthGuard, BranchContextGuard, PermissionGuard)
export class ClassroomsController {
  constructor(private readonly classroomsService: ClassroomsService) {}

  @Post('create')
  @RequiresBranchAccess()
  @RequirePermission('manage:classrooms')
  @ApiOperation({ summary: 'Create a classroom' })
  @ResponseMessage(CLASSROOM_CREATED)
  @LogActivity({ action: 'create:classroom', resource: 'classroom', includeBody: true })
  async createClassroom(
    @Body() createClassroomDto: CreateClassroomDto,
    @GetUser() user: User,
    @CurrentBranch() currentBranch: SchoolBranch,
    @GetSchoolContext() ctx: SchoolContext,
  ) {
    if (currentBranch) createClassroomDto.branchId = currentBranch.id;
    const userId = user.id;
    return this.classroomsService.create(createClassroomDto, userId, ctx.school);
  }

  @Get('')
  @RequiresBranchAccess()
  @RequirePermission('read:classrooms')
  @ApiOperation({ summary: 'Get classrooms' })
  @ResponseMessage(CLASSROOMS_FETCHED)
  async getClassrooms(
    @Query() listFilterDTO: ListFilterDTO,
    @CurrentBranch() currentBranch: SchoolBranch,
    @GetSchoolContext() ctx: SchoolContext,
  ) {
    return this.classroomsService.getClassrooms(listFilterDTO, ctx.school, currentBranch?.id);
  }

  @Get(':id')
  @RequiresBranchAccess()
  @RequirePermission('read:classrooms')
  @ApiOperation({ summary: 'Get a single classroom details' })
  @ResponseMessage(CLASSROOM_FETCHED)
  async getClassroom(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentBranch() currentBranch: SchoolBranch,
    @GetSchoolContext() ctx: SchoolContext,
  ) {
    return this.classroomsService.getClassroomDetails(id, ctx.school, currentBranch?.id);
  }
}
