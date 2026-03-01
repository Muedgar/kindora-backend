import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Param,
  ParseUUIDPipe,
  Delete,
  Patch,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage, LogActivity } from 'src/common/decorators';
import {
  GUARDIAN_ADDED,
  GUARDIAN_REMOVED,
  GUARDIAN_UPDATED,
  GUARDIANS_FETCHED,
  STUDENT_CREATED,
  STUDENTS_FETCHED,
} from './messages';
import { ListFilterDTO } from 'src/common/dtos';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { AddGuardianDto } from './dto/add-guardian.dto';
import { UpdateGuardianDto } from './dto/update-guardian.dto';
import { BranchContextGuard, JwtAuthGuard, PermissionGuard } from 'src/auth/guards';
import {
  CurrentBranch,
  GetSchoolContext,
  RequirePermission,
  RequiresBranchAccess,
} from 'src/auth/decorators';
import { SchoolBranch } from 'src/schools/entities/rwanda/school-branch.entity';
import { SchoolContext } from 'src/auth/interfaces/school-context.interface';

@ApiTags('Students')
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
    @GetSchoolContext() ctx: SchoolContext,
  ) {
    if (currentBranch) createStudentDto.branchId = currentBranch.id;
    return this.studentsService.create(createStudentDto, ctx.school);
  }

  @Get('')
  @RequiresBranchAccess()
  @RequirePermission('read:students')
  @ApiOperation({ summary: 'Get students' })
  @ResponseMessage(STUDENTS_FETCHED)
  async getStudents(
    @Query() listFilterDTO: ListFilterDTO,
    @CurrentBranch() currentBranch: SchoolBranch,
    @GetSchoolContext() ctx: SchoolContext,
  ) {
    return this.studentsService.getStudents(listFilterDTO, ctx.school, currentBranch?.id);
  }

  // ─── Guardian Endpoints ──────────────────────────────────────────────────

  @Post(':studentId/guardians')
  @RequirePermission('manage:students')
  @ApiOperation({ summary: 'Add a guardian to a student' })
  @ResponseMessage(GUARDIAN_ADDED)
  @LogActivity({ action: 'create:guardian', resource: 'guardian', includeBody: true })
  async addGuardian(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Body() dto: AddGuardianDto,
  ) {
    return this.studentsService.addGuardian(studentId, dto);
  }

  @Get(':studentId/guardians')
  @RequirePermission('read:students')
  @ApiOperation({ summary: 'Get all guardians for a student' })
  @ResponseMessage(GUARDIANS_FETCHED)
  async getGuardians(
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ) {
    return this.studentsService.getGuardians(studentId);
  }

  @Patch(':studentId/guardians/:guardianId')
  @RequirePermission('manage:students')
  @ApiOperation({ summary: 'Update a guardian link' })
  @ResponseMessage(GUARDIAN_UPDATED)
  @LogActivity({ action: 'update:guardian', resource: 'guardian', includeBody: true })
  async updateGuardian(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Param('guardianId', ParseUUIDPipe) guardianId: string,
    @Body() dto: UpdateGuardianDto,
  ) {
    return this.studentsService.updateGuardian(studentId, guardianId, dto);
  }

  @Delete(':studentId/guardians/:guardianId')
  @RequirePermission('manage:students')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a guardian from a student' })
  @ResponseMessage(GUARDIAN_REMOVED)
  @LogActivity({ action: 'delete:guardian', resource: 'guardian' })
  async removeGuardian(
    @Param('studentId', ParseUUIDPipe) studentId: string,
    @Param('guardianId', ParseUUIDPipe) guardianId: string,
  ) {
    return this.studentsService.removeGuardian(studentId, guardianId);
  }
}
