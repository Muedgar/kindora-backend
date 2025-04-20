import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiOperation } from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators';
import {
  AUTHENTICATED,
  FORGOT_PASSOWRD_EMAIL_SENT,
  PASSWORD_CHANGED,
  PASSWORD_RESET,
} from './messages';
import {
  ChangePasswordDto,
  LoginDto,
  OtpDTO,
  RequestResetPasswordDto,
  ResetPasswordDto,
} from './dto';
import { JwtAuthGuard } from './guards';
import { GetUser } from './decorators';
import { User } from 'src/users/entities';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ResponseMessage(AUTHENTICATED)
  login(@Body() loginDTO: LoginDto) {
    return this.authService.login(loginDTO);
  }

  @Post('validate-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Validate OTP' })
  @ResponseMessage(AUTHENTICATED)
  validateOtp(@Body() otpDTO: OtpDTO) {
    return this.authService.validateOTP(otpDTO);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ResponseMessage(FORGOT_PASSOWRD_EMAIL_SENT)
  requestPasswordReset(
    @Body() requestResetPasswordDTO: RequestResetPasswordDto,
  ) {
    return this.authService.requestPasswordReset(requestResetPasswordDTO);
  }

  @Post(':token/reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password' })
  @ResponseMessage(PASSWORD_RESET)
  resetPassword(
    @Param('token') token: string,
    @Body() resetPasswordDTO: ResetPasswordDto,
  ) {
    return this.authService.resetPassword(token, resetPasswordDTO);
  }

  @Patch('change-password')
  @ApiOperation({ summary: 'Change password' })
  @ResponseMessage(PASSWORD_CHANGED)
  @UseGuards(JwtAuthGuard)
  changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @GetUser() user: User,
  ) {
    return this.authService.changePassword(changePasswordDto, user);
  }
}
