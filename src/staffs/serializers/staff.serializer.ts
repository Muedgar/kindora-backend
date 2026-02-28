import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { BaseSerializer } from 'src/common/serializers';
import { UserSerializer } from 'src/users/serializers';

export class StaffSerializer extends BaseSerializer {
  @Expose()
  position: string;

  /** ID of the school this staff profile belongs to. */
  @Expose()
  @Transform(({ obj }) => obj.school?.id)
  schoolId: string;

  @Expose()
  @Type(() => UserSerializer)
  user: UserSerializer;

  @Exclude()
  version: number;
}
