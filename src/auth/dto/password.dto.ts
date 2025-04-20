import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';
import { WEAK_PASSWORD } from '../messages';
import { Match } from '../decorators';

export class RequestResetPasswordDto {
  @ApiProperty()
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @Matches(/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).+$/, {
    message: WEAK_PASSWORD,
  })
  @IsNotEmpty()
  @IsString()
  password: string;

  @ApiProperty()
  @Match('password', { message: 'Passwords do not match' })
  @IsNotEmpty()
  @IsString()
  confirmPassword: string;
}

export class ChangePasswordDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  currentPassword: string;

  @ApiProperty()
  @Matches(/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).+$/, {
    message: WEAK_PASSWORD,
  })
  @IsNotEmpty()
  @IsString()
  newPassword: string;

  @ApiProperty()
  @Match('newPassword', { message: 'Passwords do not match' })
  @IsNotEmpty()
  @IsString()
  confirmPassword: string;
}
