import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateClassroomDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  ageGroup: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  capacity: string;

  @ApiProperty()
  @IsUUID('4')
  @IsNotEmpty()
  branchId: string;
}
