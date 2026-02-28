import { Exclude, Expose, Type } from 'class-transformer';
import { BaseSerializer } from 'src/common/serializers';
import { EGuardianRelationship } from '../enums/guardian-relationship.enum';

/** Lightweight parent info included within guardian responses. */
export class GuardianParentSerializer extends BaseSerializer {
  @Expose()
  occupation: string;

  @Expose()
  phoneNumber: string;

  @Expose()
  address: string;

  @Exclude()
  version: number;
}

export class StudentGuardianSerializer extends BaseSerializer {
  @Expose()
  relationship: EGuardianRelationship;

  @Expose()
  canPickup: boolean;

  @Expose()
  isEmergencyContact: boolean;

  @Expose()
  @Type(() => GuardianParentSerializer)
  parent: GuardianParentSerializer;

  @Exclude()
  version: number;
}
