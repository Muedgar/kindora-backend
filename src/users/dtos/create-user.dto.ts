import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsStrongPassword,
  IsUUID,
} from 'class-validator';
import { UserType } from '../enums';

export class CreateUserDTO {
  @ApiProperty()
  @IsNotEmpty()
  userName: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsStrongPassword()
  @IsOptional()
  password?: string;

  @ApiProperty()
  @IsNotEmpty()
  userType: UserType;

  @ApiProperty()
  @IsUUID('4')
  role: string;
}
