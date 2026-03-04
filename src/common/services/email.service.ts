/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { InjectQueue } from '@nestjs/bull';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bull';

import { ConfigService } from '@nestjs/config';
import { MAIL_QUEUE } from '../constants';
import { Mail } from '../interfaces';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue,
    private configService: ConfigService,
  ) {}

  async sendEmail(data: Mail, jobName: string) {
    data = {
      ...data,
      data: {
        ...data.data,
        year: new Date().getFullYear(),
        clientUrl: this.configService.get('CLIENT_URL'),
      },
    };

    const sendMailEnv = this.configService.get<string>('SEND_MAIL');
    const shouldSend = ['true', '1', 'yes', 'on'].includes(
      String(sendMailEnv).toLowerCase(),
    );

    if (shouldSend) {
      const job = await this.mailQueue.add(jobName, data);
      return { jobId: job.id };
    }

    this.logger.warn(
      `Email dispatch skipped because SEND_MAIL=${sendMailEnv ?? 'undefined'}`,
    );
  }
}
