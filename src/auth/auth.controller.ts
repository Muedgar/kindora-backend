import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { ApiOperation } from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators';
import { LogActivity } from 'src/common/decorators/log-activity.decorator';
import {
  AUTHENTICATED,
  FORGOT_PASSOWRD_EMAIL_SENT,
  INVITE_ACCEPTED,
  PASSWORD_CHANGED,
  PASSWORD_RESET,
  TOKEN_REFRESHED,
  LOGGED_OUT,
  LOGGED_OUT_ALL,
  REAUTH_SUCCESS,
} from './messages';
import {
  AcceptInviteDto,
  ChangePasswordDto,
  LoginDto,
  LogoutDto,
  OtpDTO,
  ReauthDto,
  RefreshTokenDto,
  RequestResetPasswordDto,
  ResetPasswordDto,
} from './dto';
import { JwtAuthGuard, ReauthGuard } from './guards';
import { GetUser } from './decorators';
import { User } from 'src/users/entities';

/** Extract the client IP, respecting X-Forwarded-For in proxy environments. */
function getIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket?.remoteAddress ?? null;
}

/** Build a short human-readable device label from the User-Agent header. */
function getDeviceLabel(req: Request): string | null {
  const ua = req.headers['user-agent'];
  return ua ? ua.slice(0, 250) : null;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // --------------------------------------------------------------------------
  // Login / OTP
  // --------------------------------------------------------------------------

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ResponseMessage(AUTHENTICATED)
  // 10 attempts per minute per IP — guards against credential-stuffing.
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  login(@Body() loginDTO: LoginDto, @Req() req: Request) {
    return this.authService.login(loginDTO, getIp(req), getDeviceLabel(req));
  }

  @Post('validate-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate OTP' })
  @ResponseMessage(AUTHENTICATED)
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  validateOtp(@Body() otpDTO: OtpDTO, @Req() req: Request) {
    return this.authService.validateOTP(otpDTO, getIp(req), getDeviceLabel(req));
  }

  // --------------------------------------------------------------------------
  // Password management
  // --------------------------------------------------------------------------

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ResponseMessage(FORGOT_PASSOWRD_EMAIL_SENT)
  @LogActivity({ action: 'request:password-reset', resource: 'user', includeBody: true })
  // 5 requests per minute — prevents email-bombing.
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  requestPasswordReset(
    @Body() requestResetPasswordDTO: RequestResetPasswordDto,
  ) {
    return this.authService.requestPasswordReset(requestResetPasswordDTO);
  }

  @Post(':token/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password' })
  @ResponseMessage(PASSWORD_RESET)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  resetPassword(
    @Param('token') token: string,
    @Body() resetPasswordDTO: ResetPasswordDto,
  ) {
    return this.authService.resetPassword(token, resetPasswordDTO);
  }

  @Patch('change-password')
  @ApiOperation({ summary: 'Change password' })
  @ResponseMessage(PASSWORD_CHANGED)
  // JwtAuthGuard authenticates; ReauthGuard requires a fresh X-Reauth-Token
  // (from POST /auth/reauth) so a stolen access token alone cannot change the
  // account password.
  @UseGuards(JwtAuthGuard, ReauthGuard)
  changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @GetUser() user: User,
  ) {
    return this.authService.changePassword(changePasswordDto, user);
  }

  // --------------------------------------------------------------------------
  // Invite acceptance
  // --------------------------------------------------------------------------

  @Post('accept-invite')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept a school invitation and set password' })
  @ResponseMessage(INVITE_ACCEPTED)
  @LogActivity({ action: 'accept:invite', resource: 'user', includeBody: false })
  @Throttle({ default: { ttl: 60000, limit: 10 } })
  acceptInvite(@Body() dto: AcceptInviteDto, @Req() req: Request) {
    return this.authService.acceptInvite(
      dto.token,
      dto.password,
      getIp(req),
      getDeviceLabel(req),
    );
  }

  // --------------------------------------------------------------------------
  // Token refresh / logout
  // --------------------------------------------------------------------------

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and get new access token' })
  @ResponseMessage(TOKEN_REFRESHED)
  @Throttle({ default: { ttl: 60000, limit: 30 } })
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refreshToken(
      dto.refreshToken,
      getIp(req),
      getDeviceLabel(req),
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign out of the current device' })
  @ResponseMessage(LOGGED_OUT)
  @UseGuards(JwtAuthGuard)
  logout(@Body() dto: LogoutDto) {
    return this.authService.logout(dto);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign out of all devices' })
  @ResponseMessage(LOGGED_OUT_ALL)
  @UseGuards(JwtAuthGuard)
  logoutAll(@GetUser() user: User) {
    return this.authService.logoutAll(user);
  }

  // --------------------------------------------------------------------------
  // Re-authentication gate
  // --------------------------------------------------------------------------

  @Post('reauth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify identity before a sensitive action' })
  @ResponseMessage(REAUTH_SUCCESS)
  @UseGuards(JwtAuthGuard)
  // 5 attempts per minute — mitigates brute-force of the reauth gate.
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  reauth(@GetUser() user: User, @Body() dto: ReauthDto) {
    return this.authService.reauth(user, dto);
  }
}

// Export ReauthGuard so other modules can apply it directly.
export { ReauthGuard };
