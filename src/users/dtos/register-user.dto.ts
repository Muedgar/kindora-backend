import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  Matches,
} from 'class-validator';

export class RegisterUserDTO {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  schoolName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  schoolAddress: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  schoolCity: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  schoolCountry: string;

  @ApiProperty()
  @Matches(/^\+(?:[0-9] ?){6,14}[0-9]$/, {
    message:
      'Invalid international phone number format. Must start with + followed by country code and number',
  })
  @IsNotEmpty()
  @IsString()
  schoolPhoneNumber: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  schoolEnrollmentCapacity: string;

  @ApiProperty()
  @IsNotEmpty()
  userName: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsStrongPassword()
  @IsNotEmpty()
  password: string;
}
