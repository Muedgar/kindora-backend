import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SetDefaultBranchDto {
  @ApiProperty()
  @IsUUID('4')
  branchId: string;
}

