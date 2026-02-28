import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { EGuardianRelationship } from '../enums/guardian-relationship.enum';

export class UpdateGuardianDto {
  @IsEnum(EGuardianRelationship)
  @IsOptional()
  relationship?: EGuardianRelationship;

  @IsBoolean()
  @IsOptional()
  canPickup?: boolean;

  @IsBoolean()
  @IsOptional()
  isEmergencyContact?: boolean;
}
