import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesModule } from 'src/roles/roles.module';
import { User } from './entities';
import { UserController } from './users.controller';
import { UserService } from './users.service';
import { CommonModule } from 'src/common/common.module';
import { SchoolsModule } from 'src/schools/school.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    RolesModule,
    CommonModule,
    SchoolsModule,
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UsersModule {}
