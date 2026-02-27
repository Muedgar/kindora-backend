import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators';
import { STUDENT_CREATED, STUDENTS_FETCHED } from './messages';
import { ListFilterDTO } from 'src/common/dtos';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { BranchContextGuard, JwtAuthGuard, PermissionGuard } from 'src/auth/guards';
import { CurrentBranch, RequirePermission, RequiresBranchAccess } from 'src/auth/decorators';
import { SchoolBranch } from 'src/schools/entities/rwanda/school-branch.entity';

@Controller('students')
@UseGuards(JwtAuthGuard, BranchContextGuard, PermissionGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post('create')
  @RequiresBranchAccess()
  @RequirePermission('manage:students')
  @ApiOperation({ summary: 'Create a student' })
  @ResponseMessage(STUDENT_CREATED)
  async createStudent(
    @Body() createStudentDto: CreateStudentDto,
    @CurrentBranch() currentBranch: SchoolBranch,
  ) {
    if (currentBranch) createStudentDto.branchId = currentBranch.id;
    return this.studentsService.create(createStudentDto);
  }

  @Get('')
  @RequiresBranchAccess()
  @RequirePermission('read:students')
  @ApiOperation({ summary: 'Get students' })
  @ResponseMessage(STUDENTS_FETCHED)
  async getStudents(
    @Query() listFilterDTO: ListFilterDTO,
    @CurrentBranch() currentBranch: SchoolBranch,
  ) {
    return this.studentsService.getStudents(listFilterDTO, currentBranch?.id);
  }
}
