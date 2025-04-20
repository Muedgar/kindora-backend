import { Exclude, Expose, Type } from 'class-transformer';
import { BaseSerializer } from 'src/common/serializers';
import { UserSerializer } from 'src/users/serializers';

export class StaffSerializer extends BaseSerializer {
  @Expose()
  position: string;

  @Expose()
  @Type(() => UserSerializer)
  user: UserSerializer;

  @Exclude()
  version: number;
}
