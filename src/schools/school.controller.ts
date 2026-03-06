import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GetUser, RequirePermission, RequiresBranchAccess } from 'src/auth/decorators';
import { BranchContextGuard, JwtAuthGuard, PermissionGuard, SchoolContextGuard } from 'src/auth/guards';
import { User } from 'src/users/entities';
import { LogActivity } from 'src/common/decorators';
import { AssignStaffBranchDto } from './dto/assign-staff-branch.dto';
import { CreateBranchDto } from './dto/create-branch.dto';
import { SetDefaultBranchDto } from './dto/set-default-branch.dto';
import { UpdateBranchDto } from './dto/update-branch.dto';
import { SchoolService } from './school.service';

@ApiTags('Schools')
@Controller()
@UseGuards(JwtAuthGuard)
export class SchoolController {
  constructor(private readonly schoolService: SchoolService) {}

  /**
   * List all branches for a school.
   * Requires manage:schools — school admins and super admins only.
   * X-School-Id header must match the :id path param.
   */
  @Get('schools/:id/branches')
  @UseGuards(SchoolContextGuard, PermissionGuard)
  @RequirePermission('manage:schools')
  @ApiOperation({ summary: 'List all branches for a school' })
  async getSchoolBranches(@Param('id') schoolId: string) {
    return this.schoolService.getBranchesBySchool(schoolId);
  }

  @Post('schools/:id/branches')
  @UseGuards(SchoolContextGuard, PermissionGuard)
  @RequirePermission('manage:schools')
  @ApiOperation({ summary: 'Create a new branch in a school' })
  @LogActivity({ action: 'create:branch', resource: 'branch', includeBody: true })
  async createSchoolBranch(
    @Param('id') schoolId: string,
    @Body() dto: CreateBranchDto,
  ) {
    return this.schoolService.createBranch(schoolId, dto);
  }

  @Patch('schools/:id/branches/:bId')
  @UseGuards(SchoolContextGuard, PermissionGuard)
  @RequirePermission('manage:schools')
  @ApiOperation({ summary: 'Update branch details' })
  @LogActivity({ action: 'update:branch', resource: 'branch', includeBody: true })
  async updateSchoolBranch(
    @Param('id') schoolId: string,
    @Param('bId') branchId: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.schoolService.updateBranch(schoolId, branchId, dto);
  }

  /**
   * List branches the current user can access in a school.
   * Only requires active membership (SchoolContextGuard), no specific permission.
   */
  @Get('me/schools/:id/branches')
  @UseGuards(SchoolContextGuard)
  @ApiOperation({ summary: 'List branches current user can access in school' })
  async getMySchoolBranches(@Param('id') schoolId: string) {
    return this.schoolService.getBranchesBySchool(schoolId);
  }

  @Patch('me/schools/:id/default-branch')
  @ApiOperation({ summary: 'Set current user default branch for school' })
  @LogActivity({ action: 'update:default-branch', resource: 'branch', includeBody: true })
  async setDefaultBranch(
    @Param('id') schoolId: string,
    @Body() dto: SetDefaultBranchDto,
    @GetUser() user: User,
  ) {
    return this.schoolService.setDefaultBranch(user.id, schoolId, dto.branchId);
  }

  @Get('branches/:bId/staff')
  @UseGuards(BranchContextGuard, PermissionGuard)
  @RequiresBranchAccess()
  @RequirePermission('manage:schools')
  @ApiOperation({ summary: 'List staff assigned to a branch' })
  async getBranchStaff(@Param('bId') branchId: string) {
    return this.schoolService.listBranchStaff(branchId);
  }

  @Post('branches/:bId/staff')
  @UseGuards(BranchContextGuard, PermissionGuard)
  @RequiresBranchAccess()
  @RequirePermission('manage:schools')
  @ApiOperation({ summary: 'Assign staff to branch' })
  @LogActivity({ action: 'assign:staff-branch', resource: 'branch', includeBody: true })
  async assignStaffToBranch(
    @Param('bId') branchId: string,
    @Body() dto: AssignStaffBranchDto,
  ) {
    return this.schoolService.assignStaffToBranch(
      branchId,
      dto.staffId,
      dto.isPrimary ?? false,
    );
  }

  @Get('branches/:bId/classrooms')
  @UseGuards(BranchContextGuard, PermissionGuard)
  @RequiresBranchAccess()
  @RequirePermission('read:classrooms')
  @ApiOperation({ summary: 'List classrooms in a branch' })
  async getBranchClassrooms(@Param('bId') branchId: string) {
    return this.schoolService.listBranchClassrooms(branchId);
  }

  @Get('branches/:bId/students')
  @UseGuards(BranchContextGuard, PermissionGuard)
  @RequiresBranchAccess()
  @RequirePermission('read:students')
  @ApiOperation({ summary: 'List students in a branch' })
  async getBranchStudents(@Param('bId') branchId: string) {
    return this.schoolService.listBranchStudents(branchId);
  }
}
