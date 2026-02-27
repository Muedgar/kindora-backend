import { Module } from '@nestjs/common';
import { ClassroomsService } from './classrooms.service';
import { ClassroomsController } from './classrooms.controller';
import { UsersModule } from 'src/users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Classroom } from './entities/classroom.entity';
import { SchoolsModule } from 'src/schools/school.module';
import { BranchContextGuard, PermissionGuard } from 'src/auth/guards';
import { SchoolMember } from 'src/schools/entities/school-member.entity';
import { SchoolBranch } from 'src/schools/entities/rwanda/school-branch.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Classroom, SchoolMember, SchoolBranch]),
    UsersModule,
    SchoolsModule,
  ],
  controllers: [ClassroomsController],
  providers: [ClassroomsService, BranchContextGuard, PermissionGuard],
  exports: [ClassroomsService],
})
export class ClassroomsModule {}
