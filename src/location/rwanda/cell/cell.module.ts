import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VillageModule } from '../village/village.module';
import { CellController } from './cell.controller';
import { Cell } from './cell.entity';
import { CellService } from './cell.service';

@Module({
  imports: [TypeOrmModule.forFeature([Cell]), VillageModule],
  controllers: [CellController],
  providers: [CellService],
  exports: [CellService],
})
export class CellModule {}
