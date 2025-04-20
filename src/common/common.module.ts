import { Module } from '@nestjs/common';
import { EmailService } from './services';
import { EmailProcessor } from './processors';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { MAIL_QUEUE } from './constants';

const configService = new ConfigService();

@Module({
  imports: [
    BullModule.registerQueue({
      name: MAIL_QUEUE,
      redis: {
        host: configService.get('REDISHOST'),
        port: configService.get('REDISPORT'),
        password: configService.get('REDIS_PASSWORD'),
      },
    }),
  ],
  providers: [EmailService, EmailProcessor],
  exports: [EmailService],
})
export class CommonModule {}
