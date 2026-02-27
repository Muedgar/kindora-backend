import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  IsUUID,
  Matches,
} from 'class-validator';
import { ECountry } from 'src/schools/enums';

export class RegisterUserDTO {
  // personal information

  @ApiProperty()
  @IsNotEmpty()
  userName: string;

  @ApiProperty()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty()
  @IsStrongPassword()
  @IsNotEmpty()
  password: string;

  // school information

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  schoolCountry: ECountry;

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
  schoolName: string;

  // school location
  @IsString()
  @IsUUID('4', { message: 'Invalid village ID' })
  villageId: string;
}
