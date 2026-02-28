import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SchoolMember } from 'src/schools/entities/school-member.entity';
import { AuditLog } from 'src/common/entities/audit-log.entity';
import { AuditLogService } from 'src/common/services/audit-log.service';
import { AuditLogsController } from './audit-logs.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog, SchoolMember]),
  ],
  providers: [AuditLogService],
  controllers: [AuditLogsController],
})
export class AuditLogsModule {}
