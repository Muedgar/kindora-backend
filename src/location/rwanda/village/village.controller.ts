import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators';
import { ListFilterDTO } from 'src/common/dtos';
import { VILLAGES_FETCHED, VILLAGE_FETCHED } from './messages';
import { VillageService } from './village.service';

@Controller('villages')
@ApiTags('Villages')
export class VillageController {
  constructor(private villageService: VillageService) {}

  @Get('')
  @ApiOperation({ summary: 'Get villages' })
  @ResponseMessage(VILLAGES_FETCHED)
  async getVillages(@Query() listFilterDTO: ListFilterDTO) {
    return this.villageService.getVillages(listFilterDTO);
  }

  @Get('all')
  @ApiOperation({ summary: 'Get villages with relations' })
  @ResponseMessage(VILLAGES_FETCHED)
  async getVillagesWithRelations(@Query() listFilterDTO: ListFilterDTO) {
    return this.villageService.getVillagesWithRelations(listFilterDTO);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get village' })
  @ResponseMessage(VILLAGE_FETCHED)
  async getVillage(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return await this.villageService.getVillage(id);
  }
}
