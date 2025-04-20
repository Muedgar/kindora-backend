/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Exclude, Expose } from 'class-transformer';
import { BaseSerializer } from 'src/common/serializers';

export class PermissionSerializer extends BaseSerializer {
  @Expose()
  name: string;
  @Expose()
  slug: string;
  @Expose()
  status: boolean;

  @Exclude()
  version: number;
}
