import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators';
import { STUDENT_CREATED, STUDENTS_FETCHED } from './messages';
import { ListFilterDTO } from 'src/common/dtos';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { JwtAuthGuard } from 'src/auth/guards';

@Controller('students')
@UseGuards(JwtAuthGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post('create')
  @ApiOperation({ summary: 'Create a student' })
  @ResponseMessage(STUDENT_CREATED)
  async createStudent(@Body() createStudentDto: CreateStudentDto) {
    return this.studentsService.create(createStudentDto);
  }

  @Get('')
  @ApiOperation({ summary: 'Get students' })
  @ResponseMessage(STUDENTS_FETCHED)
  async getStudents(@Query() listFilterDTO: ListFilterDTO) {
    return this.studentsService.getStudents(listFilterDTO);
  }
}
