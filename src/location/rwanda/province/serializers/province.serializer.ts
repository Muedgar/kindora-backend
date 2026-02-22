import { Exclude } from 'class-transformer';
import { BaseSerializer } from 'src/common/serializers';

export class ProvinceSerializer extends BaseSerializer {
  name: string;

  @Exclude()
  version: number;
}
