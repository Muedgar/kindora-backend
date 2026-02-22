import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FilterResponse } from 'src/common/interfaces';
import { ListFilterService } from 'src/common/services';
import { FindManyOptions, Repository } from 'typeorm';
import { ProvinceFilterDto } from './dtos';
import { PROVINCE_NOT_FOUND } from './messages';
import { Province } from './province.entity';
import { ProvinceSerializer } from './serializers';

@Injectable()
export class ProvinceService {
  constructor(
    @InjectRepository(Province)
    private provinceRepository: Repository<Province>,
  ) {}

  async getProvince(id: string): Promise<Province> {
    const province = await this.provinceRepository.findOne({ where: { id } });

    if (!province) {
      throw new NotFoundException(PROVINCE_NOT_FOUND);
    }

    return province;
  }

  async getProvinceByPkid(pkid: number): Promise<Province> {
    const province = await this.provinceRepository.findOne({ where: { pkid } });

    if (!province) {
      throw new NotFoundException(PROVINCE_NOT_FOUND);
    }

    return province;
  }

  async getProvincesByPkids(ids: number[]): Promise<Province[]> {
    const promises = ids.map(async (id) => {
      return await this.getProvinceByPkid(id);
    });

    const provinces = await Promise.all(promises);
    return provinces.filter((province) => province !== null) as Province[];
  }

  async getProvinces(
    filters: ProvinceFilterDto,
  ): Promise<FilterResponse<ProvinceSerializer>> {
    const listFilterService = new ListFilterService(
      this.provinceRepository,
      ProvinceSerializer,
    );

    const options: FindManyOptions<Province> = {
      where: {
        pkid: 6,
      },
    };

    return listFilterService.filter({
      filters,
      searchFields: ['name'],
      options: filters.isDiaspora ? options : undefined,
    });
  }
}
