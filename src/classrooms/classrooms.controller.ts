import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators';
import { CLASSROOM_CREATED, CLASSROOMS_FETCHED } from './messages';
import { ListFilterDTO } from 'src/common/dtos';
import { ClassroomsService } from './classrooms.service';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { JwtAuthGuard } from 'src/auth/guards';
import { GetUser } from 'src/auth/decorators';
import { User } from 'src/users/entities';

@Controller('classrooms')
@UseGuards(JwtAuthGuard)
export class ClassroomsController {
  constructor(private readonly classroomsService: ClassroomsService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a classroom' })
  @ResponseMessage(CLASSROOM_CREATED)
  async createClassroom(
    @Body() createClassroomDto: CreateClassroomDto,
    @GetUser() user: User,
  ) {
    const userId = user.id;
    return this.classroomsService.create(createClassroomDto, userId);
  }

  @Get('')
  @ApiOperation({ summary: 'Get classrooms' })
  @ResponseMessage(CLASSROOMS_FETCHED)
  async getClassrooms(@Query() listFilterDTO: ListFilterDTO) {
    return this.classroomsService.getClassrooms(listFilterDTO);
  }
}
