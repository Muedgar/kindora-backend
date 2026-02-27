import { Exclude, Expose } from 'class-transformer';
import { BaseSerializer } from 'src/common/serializers';

/**
 * Public shape of a User in API responses.
 * Minimal by design — no role, no school, no userType.
 * School memberships are exposed via GET /me/schools (Phase 3).
 *
 * `id` is inherited and @Expose()'d by BaseSerializer.
 */
export class UserSerializer extends BaseSerializer {
  @Expose()
  firstName: string;

  @Expose()
  lastName: string;

  @Expose()
  userName: string;

  @Expose()
  email: string;

  @Expose()
  status: boolean;

  @Expose()
  isDefaultPassword: boolean;

  @Expose()
  twoFactorAuthentication: boolean;

  @Expose()
  emailVerified: boolean;

  /** Override base @Exclude to surface createdAt for audit display. */
  @Expose()
  declare createdAt: Date;

  @Exclude()
  password: string;

  @Exclude()
  version: number;

  @Exclude()
  emailVerificationKey: string;

  @Exclude()
  emailVerificationExpiry: Date;
}
