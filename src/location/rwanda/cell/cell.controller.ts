import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { ResponseMessage } from 'src/common/decorators';
import { ListFilterDTO } from 'src/common/dtos';
import { CellService } from './cell.service';
import { CELLS_FETCHED, CELL_FETCHED } from './messages';
import { CellSerializer } from './serializers';
import { VILLAGES_FETCHED } from '../village/messages';
import { VillageService } from '../village/village.service';
import { VillageSerializer } from '../village/serializers';

@Controller('cells')
@ApiTags('Cells')
export class CellController {
  constructor(
    private cellService: CellService,
    private villageService: VillageService,
  ) {}

  @Get('')
  @ApiOperation({ summary: 'Get cells' })
  @ResponseMessage(CELLS_FETCHED)
  async getCells(@Query() listFilterDTO: ListFilterDTO) {
    return this.cellService.getCells(listFilterDTO);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get cell' })
  @ResponseMessage(CELL_FETCHED)
  async geCell(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    const cell = await this.cellService.getCell(id);
    return plainToInstance(CellSerializer, cell, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id/villages')
  @ApiOperation({ summary: 'Get villages by cell' })
  @ResponseMessage(VILLAGES_FETCHED)
  async getVillagesByCell(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const foundVillages = await this.villageService.getVillagesByCellId(id);
    return plainToInstance(VillageSerializer, foundVillages, {
      excludeExtraneousValues: true,
    });
  }
}
