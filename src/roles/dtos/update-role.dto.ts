/* eslint-disable @typescript-eslint/no-unsafe-call */
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsUUID,
  Matches,
} from 'class-validator';
import { INVALID_ROLE_NAME } from '../messages';

export class UpdateRoleDTO {
  @ApiProperty()
  @Matches(/^[A-Za-z ]+$/, { message: INVALID_ROLE_NAME })
  name?: string;

  @ApiProperty()
  @IsUUID('4', { each: true })
  @ArrayNotEmpty()
  @IsArray()
  @IsOptional()
  permissions?: string[];
}
