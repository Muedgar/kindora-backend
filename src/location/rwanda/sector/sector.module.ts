import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CellModule } from '../cell/cell.module';
import { SectorController } from './sector.controller';
import { Sector } from './sector.entity';
import { SectorService } from './sector.service';

@Module({
  imports: [TypeOrmModule.forFeature([Sector]), CellModule],
  controllers: [SectorController],
  providers: [SectorService],
  exports: [SectorService],
})
export class SectorModule {}
