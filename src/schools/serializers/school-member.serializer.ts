import { Expose, Transform } from 'class-transformer';
import { BaseSerializer } from 'src/common/serializers';
import { ESchoolMemberStatus } from '../enums';

export class SchoolMemberSerializer extends BaseSerializer {
  @Expose()
  status: ESchoolMemberStatus;

  @Expose()
  isDefault: boolean;

  @Expose()
  lastSelectedAt: Date;

  /** Flat list of role objects (name + slug) for this membership. */
  @Expose()
  @Transform(({ obj }) =>
    (obj.roles ?? []).map((smr: any) => ({
      name: smr.role?.name,
      slug: smr.role?.slug,
    })),
  )
  roles: { name: string; slug: string }[];
}
