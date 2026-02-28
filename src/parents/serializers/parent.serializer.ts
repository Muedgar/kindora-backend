import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { BaseSerializer } from 'src/common/serializers';
import { UserSerializer } from 'src/users/serializers';

export class ParentSerializer extends BaseSerializer {
  @Expose()
  occupation: string;

  @Expose()
  phoneNumber: string;

  @Expose()
  address: string;

  /** ID of the school this parent profile belongs to. */
  @Expose()
  @Transform(({ obj }) => obj.school?.id)
  schoolId: string;

  @Expose()
  @Type(() => UserSerializer)
  user: UserSerializer;

  @Exclude()
  version: number;
}
