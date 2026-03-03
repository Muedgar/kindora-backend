import { Expose, Type } from 'class-transformer';
import { BaseSerializer } from 'src/common/serializers';
import { GradingLevelSerializer } from './grading-level.serializer';
import { EGradingType, GradingConfig } from '../enums/grading-type.enum';

export class ActivitySerializer extends BaseSerializer {
  @Expose()
  name: string;

  @Expose()
  description: string;

  @Expose()
  gradingType: EGradingType;

  @Expose()
  gradingConfig: GradingConfig;

  @Expose()
  @Type(() => GradingLevelSerializer)
  gradingLevels: GradingLevelSerializer[];
}
