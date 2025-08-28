import { Expose, Type } from 'class-transformer';
import { BaseSerializer } from 'src/common/serializers';
import { UserSerializer } from 'src/users/serializers';

export class GradingLevelSerializer extends BaseSerializer {
  @Expose()
  name: string;

  @Expose()
  @Type(() => UserSerializer)
  createdBy: UserSerializer;
}
