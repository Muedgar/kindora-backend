import { Exclude, Expose } from 'class-transformer';
import { BaseSerializer } from 'src/common/serializers';

export class ProvinceSerializer extends BaseSerializer {
  @Expose()
  name: string;

  @Exclude()
  version: number;
}
