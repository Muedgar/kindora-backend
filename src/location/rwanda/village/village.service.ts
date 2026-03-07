import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ListFilterDTO } from 'src/common/dtos';
import { FilterResponse } from 'src/common/interfaces';
import { ListFilterService } from 'src/common/services';
import { plainToInstance } from 'class-transformer';
import { FindManyOptions, Not, Repository } from 'typeorm';
import { Cell } from '../cell/cell.entity';
import { VILLAGES_NOT_FOUND, VILLAGE_NOT_FOUND } from './messages';
import {
  VillageSerializer,
  VillageWithRelationsSerializer,
} from './serializers';
import { Village } from './village.entity';
@Injectable()
export class VillageService {
  constructor(
    @InjectRepository(Village) private villageRepository: Repository<Village>,
    @InjectRepository(Cell) private cellRepository: Repository<Cell>,
    private listFilterService: ListFilterService,
  ) {}

  async getVillageById(id: string): Promise<Village> {
    const village = await this.villageRepository.findOne({
      where: { id },
      relations: [
        'cell',
        'cell.sector',
        'cell.sector.district',
        'cell.sector.district.province',
      ],
    });

    if (!village) {
      throw new NotFoundException(VILLAGE_NOT_FOUND);
    }

    return village;
  }

  async getVillage(id: string): Promise<VillageWithRelationsSerializer> {
    const village = await this.villageRepository.findOne({
      where: { id },
      relations: [
        'cell',
        'cell.sector',
        'cell.sector.district',
        'cell.sector.district.province',
      ],
    });

    if (!village) {
      throw new NotFoundException(VILLAGE_NOT_FOUND);
    }

    return plainToInstance(VillageWithRelationsSerializer, village, {
      excludeExtraneousValues: true,
    });
  }

  async getVillagesByCellId(id: string): Promise<Village[]> {
    const villages = await this.villageRepository.find({
      relations: [
        'cell',
        'cell.sector',
        'cell.sector.district',
        'cell.sector.district.province',
      ],
      where: { cell: { id } },
    });

    if (!villages || villages.length === 0) {
      throw new NotFoundException(`${VILLAGES_NOT_FOUND} ${id}`);
    }

    return villages;
  }

  async getVillages(
    filters: ListFilterDTO,
  ): Promise<FilterResponse<VillageSerializer>> {
    const options: FindManyOptions<Village> = {
      relations: [
        'cell',
        'cell.sector',
        'cell.sector.district',
        'cell.sector.district.province',
      ],
    };

    return this.listFilterService.filter({
      repository: this.villageRepository,
      serializer: VillageSerializer,
      filters,
      searchFields: ['name'],
      options,
    });
  }

  async getVillagesWithRelations(
    filters: ListFilterDTO,
  ): Promise<FilterResponse<VillageWithRelationsSerializer>> {
    const options: FindManyOptions<Village> = {
      relations: [
        'cell',
        'cell.sector',
        'cell.sector.district',
        'cell.sector.district.province',
      ],
    };

    return this.listFilterService.filter({
      repository: this.villageRepository,
      serializer: VillageWithRelationsSerializer,
      filters,
      searchFields: ['name'],
      options,
    });
  }

  async getVillageByPkid(pkid: number): Promise<Village> {
    const village = await this.villageRepository.findOne({ where: { pkid } });

    if (!village) {
      throw new NotFoundException(VILLAGE_NOT_FOUND);
    }

    return village;
  }
}
