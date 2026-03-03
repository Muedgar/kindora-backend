import { Expose, Type } from 'class-transformer';
import { BaseSerializer } from 'src/common/serializers';
import { ActivitySerializer } from './activity.serializer';

export class LearningAreaSerializer extends BaseSerializer {
  @Expose()
  name: string;

  @Expose()
  description: string;

  @Expose()
  @Type(() => ActivitySerializer)
  activities: ActivitySerializer[];
}
