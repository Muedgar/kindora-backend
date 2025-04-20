/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { InjectQueue } from '@nestjs/bull';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bull';

import { ConfigService } from '@nestjs/config';
import { MAIL_QUEUE } from '../constants';
import { Mail } from '../interfaces';

@Injectable()
export class EmailService {
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

    const SEND_MAIL = this.configService.get('SEND_MAIL');

    if (SEND_MAIL === 'true') {
      const job = await this.mailQueue.add(jobName, data);
      return { jobId: job.id };
    }
  }
}
