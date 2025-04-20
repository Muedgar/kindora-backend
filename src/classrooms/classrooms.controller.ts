import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators';
import { CLASSROOM_CREATED, CLASSROOMS_FETCHED } from './messages';
import { ListFilterDTO } from 'src/common/dtos';
import { ClassroomsService } from './classrooms.service';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { JwtAuthGuard } from 'src/auth/guards';

@Controller('classrooms')
@UseGuards(JwtAuthGuard)
export class ClassroomsController {
  constructor(private readonly classroomsService: ClassroomsService) {}

  @Post('create/:id')
  @ApiOperation({ summary: 'Create a classroom' })
  @ResponseMessage(CLASSROOM_CREATED)
  async createClassroom(
    @Body() createClassroomDto: CreateClassroomDto,
    @Param('id') id: string,
  ) {
    return this.classroomsService.create(createClassroomDto, id);
  }

  @Get('')
  @ApiOperation({ summary: 'Get classrooms' })
  @ResponseMessage(CLASSROOMS_FETCHED)
  async getClassrooms(@Query() listFilterDTO: ListFilterDTO) {
    return this.classroomsService.getClassrooms(listFilterDTO);
  }
}
