import { Expose, Type } from 'class-transformer';
import { BaseSerializer } from 'src/common/serializers';
import { UserSerializer } from 'src/users/serializers';
import { ActivitySerializer } from './activity.serializer';

export class ActivitiesTemplateSerializer extends BaseSerializer {
  @Expose()
  name: string;

  @Expose()
  @Type(() => ActivitySerializer)
  activities: ActivitySerializer[];

  @Expose()
  @Type(() => UserSerializer)
  createdBy: UserSerializer;
}
