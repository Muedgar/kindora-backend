import { Module } from '@nestjs/common';
import { StaffsService } from './staffs.service';
import { StaffsController } from './staffs.controller';
import { UsersModule } from 'src/users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Staff } from './entities/staff.entity';
import { StaffBranch } from './entities/staff-branch.entity';
import { SchoolsModule } from 'src/schools/school.module';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [
    CommonModule,
    TypeOrmModule.forFeature([Staff, StaffBranch]),
    UsersModule,
    SchoolsModule,
  ],
  controllers: [StaffsController],
  providers: [StaffsService],
})
export class StaffsModule {}
