import { Module } from '@nestjs/common';
import { CellModule } from './rwanda/cell/cell.module';
import { DistrictModule } from './rwanda/district/district.module';
import { ProvinceModule } from './rwanda/province/province.module';
import { SectorModule } from './rwanda/sector/sector.module';
import { VillageModule } from './rwanda/village/village.module';

const locationModules = [
  ProvinceModule,
  DistrictModule,
  SectorModule,
  CellModule,
  VillageModule,
];

@Module({
  imports: [...locationModules],
  providers: [],
  exports: [...locationModules],
})
export class LocationModule {}
