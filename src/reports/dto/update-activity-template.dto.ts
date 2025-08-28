import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';

export class UpdateActivitiesTemplateDto {
  @ApiProperty()
  @IsOptional()
  name?: string;
}
