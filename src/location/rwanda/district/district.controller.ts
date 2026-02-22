import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from 'src/common/decorators';
import { ListFilterDTO } from 'src/common/dtos';
import { SECTORS_FETCHED } from 'src/location/rwanda/sector/messages';
import { SectorService } from 'src/location/rwanda/sector/sector.service';
import { SectorSerializer } from 'src/location/rwanda/sector/serializers/sector.serializer';
import { DistrictService } from './district.service';
import { DISTRICTS_FETCHED, DISTRICT_FETCHED } from './messages';
import { DistrictSerializer } from './serializers';

@Controller('districts')
@ApiTags('Districts')
export class DistrictController {
  constructor(
    private districtService: DistrictService,
    private sectorService: SectorService,
  ) {}

  @Get('')
  @ApiOperation({ summary: 'Get districts' })
  @ResponseMessage(DISTRICTS_FETCHED)
  async getDistricts(@Query() listFilterDTO: ListFilterDTO) {
    return this.districtService.getDistricts(listFilterDTO);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get district' })
  @ResponseMessage(DISTRICT_FETCHED)
  async getDistrict(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const district = await this.districtService.getDistrict(id);
    return new DistrictSerializer(district);
  }

  @Get(':id/sectors')
  @ApiOperation({ summary: 'Get sectors by district' })
  @ResponseMessage(SECTORS_FETCHED)
  async getSectorsByDistrict(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const foundSectors = await this.sectorService.getSectorsByDistrictId(id);

    const sectors: SectorSerializer[] = [];
    if (foundSectors.length > 0) {
      foundSectors.forEach((sector) =>
        sectors.push(new SectorSerializer(sector)),
      );
    }

    return sectors;
  }
}
