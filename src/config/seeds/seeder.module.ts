import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { dataSourceOptions } from '../db/db.config';
import { Seeder } from './seeder';
import { PermissionSeederService } from './seeder.service';
import { Permission } from 'src/permissions/entities/permission.entity';
import { Role } from 'src/roles/roles.entity';
import { RoleSeederService } from './seeder-role.service';
import { SeederRole } from './seeder-roler';

@Module({
  imports: [
    TypeOrmModule.forRoot(dataSourceOptions as DataSourceOptions),
    TypeOrmModule.forFeature([Permission, Role]),
  ],
  providers: [
    Logger,
    Seeder,
    SeederRole,
    PermissionSeederService,
    RoleSeederService,
  ],
})
export class SeederModule {}
