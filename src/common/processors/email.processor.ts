/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';

import { MailerService } from '@nestjs-modules/mailer';
import {
  MAIL_QUEUE,
  OTP_VERIFICATION_EMAIL_JOB,
  PASSWORD_RESET_EMAIL_JOB,
  REGISTER_EMAIL_JOB,
  RESET_PASSWORD_EMAIL_JOB,
} from '../constants';
import { Mail } from '../interfaces';

@Processor(MAIL_QUEUE)
export class EmailProcessor {
  constructor(private mailService: MailerService) {}

  @Process(REGISTER_EMAIL_JOB)
  async sendRegisterEmail(job: Job<Mail>) {
    const { data } = job;

    await this.mailService
      .sendMail({
        ...data,
        subject: 'New Account',
        template: 'register-email',
        context: {
          data: data.data,
        },
      })
      .then(() => {
        console.log('email send successfully');
      })
      .catch((e) => {
        console.log(e);
      });
  }

  @Process(RESET_PASSWORD_EMAIL_JOB)
  async sendResetPasswordEMail(job: Job<Mail>) {
    const { data } = job;

    await this.mailService.sendMail({
      ...data,
      subject: 'Reset Password',
      template: 'reset-password-email',
      context: {
        data: data.data,
      },
    });
  }

  @Process(PASSWORD_RESET_EMAIL_JOB)
  async sendSuccessfulPasswordResetEMail(job: Job<Mail>) {
    const { data } = job;

    await this.mailService.sendMail({
      ...data,
      subject: 'Reset Password',
      template: 'password-reset-email',
      context: {
        data: data.data,
      },
    });
  }

  @Process(OTP_VERIFICATION_EMAIL_JOB)
  async sendOtpVerificationEMail(job: Job<Mail>) {
    const { data } = job;

    await this.mailService.sendMail({
      ...data,
      subject: 'Account Verification',
      template: 'otp-verification-email',
      context: {
        data: data.data,
      },
    });
  }
}
