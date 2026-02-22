import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators';
import { ListFilterDTO } from 'src/common/dtos';
import { SECTORS_FETCHED, SECTOR_FETCHED } from './messages';
import { SectorService } from './sector.service';
import { SectorSerializer } from './serializers/sector.serializer';
import { CellService } from '../cell/cell.service';
import { CELLS_FETCHED } from '../cell/messages';
import { CellSerializer } from '../cell/serializers';

@Controller('sectors')
@ApiTags('Sectors')
export class SectorController {
  constructor(
    private sectorService: SectorService,
    private cellService: CellService,
  ) {}

  @Get('')
  @ApiOperation({ summary: 'Get sectors' })
  @ResponseMessage(SECTORS_FETCHED)
  async getSectors(@Query() listFilterDTO: ListFilterDTO) {
    return this.sectorService.getSectors(listFilterDTO);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get sector' })
  @ResponseMessage(SECTOR_FETCHED)
  async getSector(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const sector = await this.sectorService.getSector(id);
    return new SectorSerializer(sector);
  }

  @Get(':id/cells')
  @ApiOperation({ summary: 'Get cells by sector' })
  @ResponseMessage(CELLS_FETCHED)
  async getCellsBySector(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const foundCells = await this.cellService.getCellsBySectorId(id);

    const cells: CellSerializer[] = [];
    if (foundCells.length > 0) {
      foundCells.forEach((cell) => cells.push(new CellSerializer(cell)));
    }

    return cells;
  }
}
