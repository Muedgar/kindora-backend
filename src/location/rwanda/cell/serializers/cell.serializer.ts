import { Exclude, Expose, Type } from 'class-transformer';
import { BaseSerializer } from 'src/common/serializers';

class ProvinceSerializer extends BaseSerializer {
  @Expose()
  name: string;

  @Exclude()
  version: number;
}

class DistrictSerializer extends BaseSerializer {
  @Expose()
  name: string;

  @Expose()
  @Type(() => ProvinceSerializer)
  province: ProvinceSerializer;

  @Exclude()
  version: number;
}

class SectorSerializer extends BaseSerializer {
  @Expose()
  name: string;

  @Expose()
  @Type(() => DistrictSerializer)
  district: DistrictSerializer;

  @Exclude()
  version: number;
}

export class CellSerializer extends BaseSerializer {
  @Expose()
  name: string;

  @Expose()
  @Type(() => SectorSerializer)
  sector: SectorSerializer;

  @Exclude()
  version: number;
}
