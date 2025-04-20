/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Exclude, Expose, Type } from 'class-transformer';

import { BaseSerializer } from 'src/common/serializers';
import { PermissionSerializer } from 'src/permissions/serializers';

export class RoleSerializer extends BaseSerializer {
  @Expose()
  name: string;
  @Expose()
  status: boolean;
  @Expose()
  slug: string;

  @Expose()
  @Type(() => PermissionSerializer)
  permissions: PermissionSerializer[];

  @Exclude()
  version: number;
}
