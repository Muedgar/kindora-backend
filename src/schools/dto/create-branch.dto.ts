import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { ECountry } from '../enums';

export class CreateBranchDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  code: number;

  @ApiProperty({ enum: ECountry, default: ECountry.RWANDA })
  @IsEnum(ECountry)
  country: ECountry;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty()
  @IsUUID('4')
  rwandaVillageId: string;

  @ApiProperty({ required: false, default: false })
  @IsOptional()
  @IsBoolean()
  isMainBranch?: boolean;
}

