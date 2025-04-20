import { Exclude, Expose } from 'class-transformer';
import { BaseSerializer } from 'src/common/serializers';

export class RoleUserSerializer extends BaseSerializer {
  name: string;

  @Expose()
  status: boolean;

  @Expose()
  slug: string;

  @Exclude()
  version: number;
}
