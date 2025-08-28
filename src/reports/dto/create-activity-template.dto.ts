import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateActivitiesTemplateDto {
  @ApiProperty()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsUUID('4', { each: true })
  @ArrayNotEmpty()
  @IsArray()
  activities: string[];
}
