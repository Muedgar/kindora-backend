import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DistrictModule } from 'src/location/rwanda/district/district.module';
import { ProvinceController } from './province.controller';
import { Province } from './province.entity';
import { ProvinceService } from './province.service';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [
    CommonModule,TypeOrmModule.forFeature([Province]), DistrictModule],
  controllers: [ProvinceController],
  providers: [ProvinceService],
  exports: [ProvinceService],
})
export class ProvinceModule {}
