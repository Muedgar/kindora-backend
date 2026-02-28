import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { EGuardianRelationship } from '../enums/guardian-relationship.enum';

export class AddGuardianDto {
  @IsUUID()
  @IsNotEmpty()
  parentId: string;

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
