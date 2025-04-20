/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Exclude, Expose } from 'class-transformer';
import { BaseSerializer } from 'src/common/serializers';

export class RolePermissionSerializer extends BaseSerializer {
  @Expose()
  name: string;

  @Expose()
  slug: string;

  @Exclude()
  version: number;

  @Expose()
  status: boolean;
}
