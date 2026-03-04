import { Module } from '@nestjs/common';
import {
  EmailService,
  AuditLogService,
  ListFilterService,
  MailHealthService,
} from './services';
import { EmailProcessor } from './processors';
import { BullModule } from '@nestjs/bull';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MAIL_QUEUE } from './constants';
import { AuditLog } from './entities/audit-log.entity';
import { MailHealthController } from './controllers/mail-health.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog]),
    BullModule.registerQueue({
      name: MAIL_QUEUE,
    }),
  ],
  controllers: [MailHealthController],
  providers: [
    EmailService,
    EmailProcessor,
    AuditLogService,
    ListFilterService,
    MailHealthService,
  ],
  exports: [EmailService, AuditLogService, ListFilterService, MailHealthService],
})
export class CommonModule {}
