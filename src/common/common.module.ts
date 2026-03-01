import { Module } from '@nestjs/common';
import { EmailService, AuditLogService, ListFilterService } from './services';
import { EmailProcessor } from './processors';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MAIL_QUEUE } from './constants';
import { AuditLog } from './entities/audit-log.entity';

const configService = new ConfigService();

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog]),
    BullModule.registerQueue({
      name: MAIL_QUEUE,
      redis: {
        host: configService.get('REDISHOST'),
        port: configService.get('REDISPORT'),
        password: configService.get('REDIS_PASSWORD'),
      },
    }),
  ],
  providers: [EmailService, EmailProcessor, AuditLogService, ListFilterService],
  exports: [EmailService, AuditLogService, ListFilterService],
})
export class CommonModule {}
