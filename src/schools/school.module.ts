import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { School } from './entities/school.entity';
import { SchoolMember } from './entities/school-member.entity';
import { SchoolMemberRole } from './entities/school-member-role.entity';
import { SchoolService } from './school.service';
import { SchoolBranch } from './entities/rwanda/school-branch.entity';
import { SchoolController } from './school.controller';
import { StaffBranch } from 'src/staffs/entities/staff-branch.entity';
import { Staff } from 'src/staffs/entities/staff.entity';
import { Classroom } from 'src/classrooms/entities/classroom.entity';
import { Student } from 'src/students/entities/student.entity';
import {
  BranchContextGuard,
  JwtAuthGuard,
  PermissionGuard,
  SchoolContextGuard,
} from 'src/auth/guards';
import { VillageModule } from 'src/location/rwanda/village/village.module';

@Module({
  imports: [
    VillageModule,
    TypeOrmModule.forFeature([
      School,
      SchoolMember,
      SchoolMemberRole,
      SchoolBranch,
      StaffBranch,
      Staff,
      Classroom,
      Student,
    ]),
  ],
  controllers: [SchoolController],
  providers: [SchoolService, BranchContextGuard, SchoolContextGuard, JwtAuthGuard, PermissionGuard],
  exports: [SchoolService, BranchContextGuard, SchoolContextGuard, PermissionGuard, TypeOrmModule],
})
export class SchoolsModule {}
