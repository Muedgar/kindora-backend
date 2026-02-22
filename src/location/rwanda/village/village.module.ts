import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cell } from '../cell/cell.entity';
import { VillageController } from './village.controller';
import { Village } from './village.entity';
import { VillageService } from './village.service';

@Module({
  imports: [TypeOrmModule.forFeature([Village, Cell])],
  controllers: [VillageController],
  providers: [VillageService],
  exports: [VillageService],
})
export class VillageModule {}
