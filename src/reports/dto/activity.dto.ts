import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EGradingType } from '../enums/grading-type.enum';

class NumericGradingConfigDto {
  @ApiProperty({ example: 0 })
  @IsNumber()
  min: number;

  @ApiProperty({ example: 10 })
  @IsNumber()
  max: number;
}

class FrequencyGradingConfigDto {
  @ApiProperty({ example: 5 })
  @IsNumber()
  maxFrequency: number;
}

export class CreateActivityDto {
  @ApiProperty({ example: 'Letter Recognition' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({
    example: 'Identifying upper and lower case letters of the alphabet',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiProperty({
    enum: EGradingType,
    default: EGradingType.RUBRIC,
    description:
      'Grading strategy. NUMERIC and FREQUENCY require a gradingConfig object.',
  })
  @IsEnum(EGradingType)
  gradingType: EGradingType;

  /**
   * Required when gradingType is NUMERIC or FREQUENCY; ignored otherwise.
   * NUMERIC   → { min: number, max: number }
   * FREQUENCY → { maxFrequency: number }
   */
  @ApiPropertyOptional({
    oneOf: [
      { $ref: '#/components/schemas/NumericGradingConfigDto' },
      { $ref: '#/components/schemas/FrequencyGradingConfigDto' },
    ],
  })
  @ValidateIf(
    (o: CreateActivityDto) =>
      o.gradingType === EGradingType.NUMERIC ||
      o.gradingType === EGradingType.FREQUENCY,
  )
  @IsObject()
  gradingConfig?: NumericGradingConfigDto | FrequencyGradingConfigDto;

  @ApiProperty({
    type: [String],
    description: 'UUIDs of grading level descriptors to attach',
  })
  @IsUUID('4', { each: true })
  @ArrayNotEmpty()
  @IsArray()
  gradingLevels: string[];
}

export class UpdateActivityDto extends PartialType(CreateActivityDto) {}
