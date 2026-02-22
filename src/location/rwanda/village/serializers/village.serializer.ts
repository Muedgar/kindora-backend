import { Exclude, Type } from 'class-transformer';
import { BaseSerializer } from 'src/common/serializers';

export class VillageSerializer extends BaseSerializer {
  name: string;

  @Exclude()
  version: number;
}

class DistrictSerializer extends BaseSerializer {
  name: string;

  @Exclude()
  version: number;
}

class SectorSerializer extends BaseSerializer {
  name: string;

  @Type(() => DistrictSerializer)
  district: DistrictSerializer;

  @Exclude()
  version: number;
}

class CellSerializer extends BaseSerializer {
  name: string;

  @Type(() => SectorSerializer)
  sector: SectorSerializer;

  @Exclude()
  version: number;
}

export class VillageWithRelationsSerializer extends BaseSerializer {
  @Type(() => CellSerializer)
  cell: CellSerializer;

  @Exclude()
  version: number;
}
