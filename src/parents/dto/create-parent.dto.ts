import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class CreateParentDto {
  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  userName?: string;

  @ApiProperty()
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  occupation?: string;

  @ApiProperty({ required: false })
  @Matches(/^\+(?:[0-9] ?){6,14}[0-9]$/, {
    message:
      'Invalid international phone number format. Must start with + followed by country code and number',
  })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  /** UUID of the Role to assign to this parent within the current school. */
  @ApiProperty()
  @IsUUID('4')
  @IsNotEmpty()
  roleId: string;
}
