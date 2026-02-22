import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SectorModule } from '../sector/sector.module';
import { DistrictController } from './district.controller';
import { District } from './district.entity';
import { DistrictService } from './district.service';

@Module({
  imports: [TypeOrmModule.forFeature([District]), SectorModule],
  controllers: [DistrictController],
  providers: [DistrictService],
  exports: [DistrictService],
})
export class DistrictModule {}
