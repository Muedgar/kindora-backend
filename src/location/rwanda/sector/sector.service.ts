import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ListFilterDTO } from 'src/common/dtos';
import { FilterResponse } from 'src/common/interfaces';
import { ListFilterService } from 'src/common/services';
import { FindManyOptions, Repository } from 'typeorm';
import { SECTORS_NOT_FOUND, SECTOR_NOT_FOUND } from './messages';
import { Sector } from './sector.entity';
import { SectorSerializer } from './serializers/sector.serializer';

@Injectable()
export class SectorService {
  constructor(
    @InjectRepository(Sector) private sectorRepository: Repository<Sector>,
    private listFilterService: ListFilterService,
  ) {}

  async getSectorById(id: string): Promise<Sector> {
    const sector = await this.sectorRepository.findOne({
      where: { id },
      relations: ['district', 'district.province'],
    });

    if (!sector) {
      throw new NotFoundException(SECTOR_NOT_FOUND);
    }

    return sector;
  }

  async getSector(id: string): Promise<Sector> {
    const sector = await this.sectorRepository.findOne({
      where: { id },
      relations: ['district'],
      select: {
        district: {
          id: true,
          name: true,
        },
      },
    });

    if (!sector) {
      throw new NotFoundException(SECTOR_NOT_FOUND);
    }

    return sector;
  }

  async getSectorsByDistrictId(id: string): Promise<Sector[]> {
    const sectors = await this.sectorRepository.find({
      where: { district: { id } },
      relations: ['district', 'district.province'],
    });

    if (!sectors || sectors.length === 0) {
      throw new NotFoundException(`${SECTORS_NOT_FOUND} ${id}`);
    }

    return sectors;
  }

  async getSectors(
    filters: ListFilterDTO,
  ): Promise<FilterResponse<SectorSerializer>> {
    const options: FindManyOptions<Sector> = {
      relations: ['district', 'district.province'],
    };

    return this.listFilterService.filter({
      repository: this.sectorRepository,
      serializer: SectorSerializer,
      filters,
      searchFields: ['name'],
      options,
    });
  }

  async getSectorByPkid(pkid: number): Promise<Sector> {
    const sector = await this.sectorRepository.findOne({ where: { pkid } });

    if (!sector) {
      throw new NotFoundException(SECTOR_NOT_FOUND);
    }

    return sector;
  }
}
