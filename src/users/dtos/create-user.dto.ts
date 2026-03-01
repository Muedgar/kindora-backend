import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsEmail,
  IsOptional,
  IsArray,
  IsNotEmpty,
  IsString,
  IsStrongPassword,
  IsUUID,
} from 'class-validator';

export class CreateUserDTO {
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
  @IsStrongPassword({ minLength: 12 })
  @IsOptional()
  password?: string;

  /** UUID of the Role to assign to this user within the current school. */
  @ApiProperty()
  @IsUUID('4')
  @IsNotEmpty()
  roleId: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  branchIds?: string[];
}
