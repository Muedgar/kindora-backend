import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/users/users.service';
import {
  DEACTIVATED_USER,
  INVALID_OTP,
  INVALID_TOKEN,
  INVITE_TOKEN_EXPIRED,
  INVITE_TOKEN_INVALID,
  OTP_EXPIRED,
} from './messages';
import { SchoolMember } from 'src/schools/entities/school-member.entity';
import { ESchoolMemberStatus } from 'src/schools/enums';
import * as bcrypt from 'bcryptjs';
import {
  ChangePasswordDto,
  LoginDto,
  OtpDTO,
  RequestResetPasswordDto,
  ResetPasswordDto,
} from './dto';
import { UserSerializer } from 'src/users/serializers';
import {
  INVALID_CREDENTIALS,
  INVALID_CURRENT_PASSWORD,
} from 'src/users/messages';
import { JwtPayload } from './interfaces';
import { RequestUser } from './types';
import { Mail } from 'src/common/interfaces';
import { EmailService } from 'src/common/services';
import {
  OTP_VERIFICATION_EMAIL_JOB,
  PASSWORD_RESET_EMAIL_JOB,
  RESET_PASSWORD_EMAIL_JOB,
} from 'src/common/constants';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(SchoolMember)
    private schoolMemberRepository: Repository<SchoolMember>,
    private jwtService: JwtService,
    private userService: UserService,
    private emailService: EmailService,
  ) {}

  private async decodeToken(token: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync(token);
    } catch {
      throw new BadRequestException(INVALID_TOKEN);
    }
  }

  private convertOtpToArray(otp: string): number[] {
    return otp.split('').map(Number);
  }

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private hashOTP(otp: string): string {
    return bcrypt.hashSync(otp, bcrypt.genSaltSync(10));
  }

  async login(loginDTO: LoginDto): Promise<{
    token?: string;
    user?: UserSerializer | { email: string };
    requiresOtp?: boolean;
  }> {
    const { email, password } = loginDTO;
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user || !bcrypt.compareSync(password, user.password)) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (!user.status) {
      throw new UnauthorizedException(DEACTIVATED_USER);
    }

    if (user.twoFactorAuthentication) {
      const otp = this.generateOTP();
      const otpExpiry = new Date();
      otpExpiry.setMinutes(otpExpiry.getMinutes() + 5);

      user.emailVerificationKey = this.hashOTP(otp);
      user.emailVerificationExpiry = otpExpiry;
      await this.userRepository.save(user);

      const emailData: Mail = {
        to: user.email,
        data: {
          firstName: user.userName,
          otp: this.convertOtpToArray(otp),
        },
      };

      await this.emailService.sendEmail(emailData, OTP_VERIFICATION_EMAIL_JOB);

      return { requiresOtp: true, user: { email: user.email } };
    }

    const payload: JwtPayload = { id: user.id, email: user.email };
    const token = this.jwtService.sign(payload);

    return { token, user: new UserSerializer(user) };
  }

  async validateOTP(
    otpDto: OtpDTO,
  ): Promise<{ token: string; user: UserSerializer }> {
    const { email, otp } = otpDto;
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (!bcrypt.compareSync(otp, user.emailVerificationKey)) {
      throw new UnauthorizedException(INVALID_OTP);
    }

    if (new Date() > user.emailVerificationExpiry) {
      throw new UnauthorizedException(OTP_EXPIRED);
    }

    user.emailVerificationKey = '';
    user.emailVerificationExpiry = new Date();
    user.emailVerified = true;
    await this.userRepository.save(user);

    const payload: JwtPayload = { id: user.id, email: user.email };
    const token = this.jwtService.sign(payload);

    return { token, user: new UserSerializer(user) };
  }

  async requestPasswordReset(
    requestResetPasswordDTO: RequestResetPasswordDto,
  ): Promise<void> {
    const user = await this.userService.getUserByEmail(
      requestResetPasswordDTO.email,
    );

    const payload: JwtPayload = { id: user.id, email: user.email };
    const token = this.jwtService.sign(payload);

    const emailData: Mail = {
      to: user.email,
      data: { firstName: user.firstName, token },
    };

    await this.emailService.sendEmail(emailData, RESET_PASSWORD_EMAIL_JOB);
  }

  async resetPassword(
    token: string,
    resetPasswordDTO: ResetPasswordDto,
  ): Promise<void> {
    const payload: JwtPayload = await this.decodeToken(token);
    const user = await this.userService.getUser(payload.id);
    const hash = bcrypt.hashSync(
      resetPasswordDTO.password,
      bcrypt.genSaltSync(10),
    );
    user.password = hash;
    user.isDefaultPassword = false;

    const savedUser = await this.userRepository.save(user);

    const emailData: Mail = {
      to: savedUser.email,
      data: { firstName: savedUser.firstName },
    };

    await this.emailService.sendEmail(emailData, PASSWORD_RESET_EMAIL_JOB);
  }

  async changePassword(
    changePasswordDTO: ChangePasswordDto,
    reqUser: RequestUser,
  ): Promise<void> {
    const user = await this.userService.getUser(reqUser.id);

    if (!bcrypt.compareSync(changePasswordDTO.currentPassword, user.password)) {
      throw new BadRequestException(INVALID_CURRENT_PASSWORD);
    }

    user.password = bcrypt.hashSync(
      changePasswordDTO.newPassword,
      bcrypt.genSaltSync(10),
    );
    user.isDefaultPassword = false;
    await this.userRepository.save(user);
  }

  /**
   * Accepts a school invitation.
   *
   * Validates the signed invite JWT, sets the user's chosen password,
   * marks emailVerified = true, and transitions the SchoolMember status
   * from INVITED → ACTIVE.
   *
   * Returns a session token so the user is logged in immediately.
   */
  async acceptInvite(
    token: string,
    password: string,
  ): Promise<{ token: string; user: UserSerializer }> {
    // 1. Verify & decode the JWT
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new BadRequestException(INVITE_TOKEN_EXPIRED);
    }

    // 2. Reject tokens that weren't issued for the invite flow
    if (payload.purpose !== 'invite') {
      throw new BadRequestException(INVITE_TOKEN_INVALID);
    }

    // 3. Load the user
    const user = await this.userService.getUser(payload.id);

    // 4. Set the chosen password and mark the account verified
    user.password = bcrypt.hashSync(password, bcrypt.genSaltSync(10));
    user.isDefaultPassword = false;
    user.emailVerified = true;
    await this.userRepository.save(user);

    // 5. Activate the pending school membership
    const membership = await this.schoolMemberRepository.findOne({
      where: {
        member: { id: user.id },
        status: ESchoolMemberStatus.INVITED,
      },
    });

    if (membership) {
      membership.status = ESchoolMemberStatus.ACTIVE;
      membership.acceptedAt = new Date();
      await this.schoolMemberRepository.save(membership);
    }

    // 6. Issue a session token so the user is logged in immediately
    const sessionPayload: JwtPayload = { id: user.id, email: user.email };
    const sessionToken = this.jwtService.sign(sessionPayload);

    return { token: sessionToken, user: new UserSerializer(user) };
  }
}
