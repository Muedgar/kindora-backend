import { Expose, Type } from 'class-transformer';
import { BaseSerializer } from 'src/common/serializers';
import { UserSerializer } from 'src/users/serializers';
import { GradingLevelSerializer } from './grading-level.serializer';

export class ActivitySerializer extends BaseSerializer {
  @Expose()
  name: string;

  @Expose()
  description: string;

  @Expose()
  @Type(() => GradingLevelSerializer)
  gradingLevels: GradingLevelSerializer[];

  @Expose()
  @Type(() => UserSerializer)
  createdBy: UserSerializer;
}
