import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class CreateGradingLevelDto {
  @ApiProperty()
  @IsNotEmpty()
  name: string;
}
