import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentsService } from './students.service';
import { StudentsController } from './students.controller';
import { ClassroomsModule } from 'src/classrooms/classrooms.module';
import { Student } from './entities/student.entity';
import { StudentGuardian } from './entities/student-guardian.entity';
import { SchoolsModule } from 'src/schools/school.module';
import { BranchContextGuard, PermissionGuard } from 'src/auth/guards';
import { SchoolMember } from 'src/schools/entities/school-member.entity';
import { SchoolBranch } from 'src/schools/entities/rwanda/school-branch.entity';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [
    CommonModule,
    TypeOrmModule.forFeature([
      Student,
      StudentGuardian,
      SchoolMember,
      SchoolBranch,
    ]),
    ClassroomsModule,
    SchoolsModule,
  ],
  controllers: [StudentsController],
  providers: [StudentsService, BranchContextGuard, PermissionGuard],
  exports: [StudentsService, TypeOrmModule],
})
export class StudentsModule {}
