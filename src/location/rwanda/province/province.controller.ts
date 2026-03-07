import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { ResponseMessage } from 'src/common/decorators';
import { DistrictService } from 'src/location/rwanda/district/district.service';
import { DISTRICTS_FETCHED } from 'src/location/rwanda/district/messages';
import { DistrictSerializer } from 'src/location/rwanda/district/serializers';
import { ProvinceFilterDto } from './dtos';
import { PROVINCES_FETCHED, PROVINCE_FETCHED } from './messages';
import { ProvinceService } from './province.service';
import { ProvinceSerializer } from './serializers';

@Controller('provinces')
@ApiTags('Provinces')
export class ProvinceController {
  constructor(
    private provinceService: ProvinceService,
    private districtService: DistrictService,
  ) {}

  @Get('')
  @ApiOperation({ summary: 'Get provinces' })
  @ResponseMessage(PROVINCES_FETCHED)
  async getProvinces(@Query() listFilterDTO: ProvinceFilterDto) {
    return this.provinceService.getProvinces(listFilterDTO);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get province' })
  @ResponseMessage(PROVINCE_FETCHED)
  async getProvince(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const province = await this.provinceService.getProvince(id);
    return plainToInstance(ProvinceSerializer, province, {
      excludeExtraneousValues: true,
    });
  }

  @Get(':id/districts')
  @ApiOperation({ summary: 'Get districts by province' })
  @ResponseMessage(DISTRICTS_FETCHED)
  async getDistrictsByProvince(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const foundDistricts =
      await this.districtService.getDistrictsByProvinceId(id);
    return plainToInstance(DistrictSerializer, foundDistricts, {
      excludeExtraneousValues: true,
    });
  }
}
