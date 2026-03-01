import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ListFilterDTO } from 'src/common/dtos';
import { FilterResponse } from 'src/common/interfaces';
import { ListFilterService } from 'src/common/services';
import { Repository } from 'typeorm';
import { District } from './district.entity';
import { DISTRICTS_NOT_FOUND, DISTRICT_NOT_FOUND } from './messages';
import { DistrictSerializer } from './serializers';

@Injectable()
export class DistrictService {
  constructor(
    @InjectRepository(District)
    private districtRepository: Repository<District>,
    private listFilterService: ListFilterService,
  ) {}

  async getDistrictById(id: string): Promise<District> {
    const district = await this.districtRepository.findOne({
      where: { id },
      relations: ['province'],
    });

    if (!district) {
      throw new NotFoundException(DISTRICT_NOT_FOUND);
    }

    return district;
  }

  async getDistrict(id: string): Promise<District> {
    const district = await this.districtRepository.findOne({
      where: { id },
      relations: ['province'],
      select: {
        province: {
          id: true,
          name: true,
        },
      },
    });

    if (!district) {
      throw new NotFoundException(DISTRICT_NOT_FOUND);
    }

    return district;
  }

  async getDistrictByPkid(pkid: number): Promise<District> {
    const district = await this.districtRepository.findOne({ where: { pkid } });

    if (!district) {
      throw new NotFoundException(DISTRICT_NOT_FOUND);
    }

    return district;
  }

  async getDistrictsByProvinceId(id: string): Promise<District[]> {
    const districts = await this.districtRepository.find({
      where: { province: { id } },
    });

    if (!districts || districts.length === 0) {
      throw new NotFoundException(`${DISTRICTS_NOT_FOUND} ${id}`);
    }

    return districts;
  }

  async getDistrictsByProvincePkid(pkid: number): Promise<District[]> {
    const districts = await this.districtRepository.find({
      where: { province: { pkid } },
      relations: ['province'],
    });

    if (!districts || districts.length === 0) {
      throw new NotFoundException(`${DISTRICTS_NOT_FOUND} ${pkid}`);
    }

    return districts;
  }

  async getDistricts(
    filters: ListFilterDTO,
  ): Promise<FilterResponse<DistrictSerializer>> {
    return this.listFilterService.filter({
      repository: this.districtRepository,
      serializer: DistrictSerializer,
      filters,
      searchFields: ['name'],
    });
  }
}
