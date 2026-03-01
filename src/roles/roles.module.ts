import { Module } from '@nestjs/common';
import { RoleController } from './roles.controller';
import { RoleService } from './roles.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './roles.entity';
import { PermissionsModule } from 'src/permissions/permissions.module';
import { SchoolsModule } from 'src/schools/school.module';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [
    CommonModule,TypeOrmModule.forFeature([Role]), PermissionsModule, SchoolsModule],
  controllers: [RoleController],
  providers: [RoleService],
  exports: [RoleService],
})
export class RolesModule {}
