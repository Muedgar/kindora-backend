import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { Province } from 'src/location/rwanda/province/province.entity';
import { District } from 'src/location/rwanda/district/district.entity';
import { Sector } from 'src/location/rwanda/sector/sector.entity';
import { Cell } from 'src/location/rwanda/cell/cell.entity';
import { Village } from 'src/location/rwanda/village/village.entity';
import { RwandaLocationSeederService } from './rwanda-location-seeder.service';
import { dataSourceOptions } from 'src/config/db/db.config';

const locationEntities = [Province, District, Sector, Cell, Village];
const dbOptions: DataSourceOptions = {
  ...(dataSourceOptions as DataSourceOptions),
  synchronize: false,
};

@Module({
  imports: [
    TypeOrmModule.forRoot(dbOptions),
    TypeOrmModule.forFeature(locationEntities),
  ],
  providers: [Logger, RwandaLocationSeederService],
})
export class RwandaLocationSeederModule {}
