/* eslint-disable @typescript-eslint/no-unsafe-argument */
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';

import { MailerService } from '@nestjs-modules/mailer';
import { Logger } from '@nestjs/common';
import {
  INVITE_EMAIL_JOB,
  MAIL_QUEUE,
  OTP_VERIFICATION_EMAIL_JOB,
  PASSWORD_RESET_EMAIL_JOB,
  REGISTER_EMAIL_JOB,
  RESET_PASSWORD_EMAIL_JOB,
} from '../constants';
import { Mail } from '../interfaces';

@Processor(MAIL_QUEUE)
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private mailService: MailerService) {}

  @Process(REGISTER_EMAIL_JOB)
  async sendRegisterEmail(job: Job<Mail>) {
    const { data } = job;

    try {
      await this.mailService.sendMail({
        ...data,
        subject: 'New Account',
        template: 'register-email',
        context: {
          data: data.data,
        },
      });
      this.logger.log(`Register email sent to ${data.to}`);
    } catch (error) {
      this.logger.error(
        `Failed to send register email to ${data.to}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
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

  @Process(INVITE_EMAIL_JOB)
  async sendInviteEmail(job: Job<Mail>) {
    const { data } = job;

    await this.mailService.sendMail({
      ...data,
      subject: "You've been invited to Kindora",
      template: 'invite-email',
      context: {
        data: data.data,
      },
    });
  }
}
