import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { UserType } from '../enums';

export class UpdateUserDTO {
  @ApiProperty()
  @IsOptional()
  userName: string;

  @ApiProperty()
  @IsOptional()
  userType: UserType;

  @ApiProperty()
  @IsOptional()
  @IsUUID('4')
  role: string;
}
