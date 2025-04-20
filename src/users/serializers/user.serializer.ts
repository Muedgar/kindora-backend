import { Exclude, Expose, Type } from 'class-transformer';
import { BaseSerializer } from 'src/common/serializers';
import { RoleSerializer } from 'src/roles/serializers';
import { SchoolSerializer } from 'src/schools/serializers';
import { UserType } from '../enums';

export class UserSerializer extends BaseSerializer {
  @Expose()
  userName: string;

  @Expose()
  email: string;

  @Expose()
  @Type(() => SchoolSerializer)
  school: SchoolSerializer;

  @Expose()
  status: boolean;

  @Expose()
  isDefaultPassword: boolean;

  @Expose()
  userType: UserType;

  @Expose()
  twoFactorAuthentication: boolean;

  @Expose()
  @Type(() => RoleSerializer)
  role: RoleSerializer[];

  @Exclude()
  version: number;

  @Exclude()
  password: string;

  @Exclude()
  emailVerified: boolean;

  @Exclude()
  emailVerificationKey: string;

  @Exclude()
  emailVerificationExpiry: Date;
  firstName: any;
}
