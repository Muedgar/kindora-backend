import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SectorModule } from '../sector/sector.module';
import { DistrictController } from './district.controller';
import { District } from './district.entity';
import { DistrictService } from './district.service';
import { CommonModule } from 'src/common/common.module';

@Module({
  imports: [
    CommonModule,TypeOrmModule.forFeature([District]), SectorModule],
  controllers: [DistrictController],
  providers: [DistrictService],
  exports: [DistrictService],
})
export class DistrictModule {}
