import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ListFilterDTO } from 'src/common/dtos';
import { FilterResponse } from 'src/common/interfaces';
import { ListFilterService } from 'src/common/services';
import { Repository } from 'typeorm';
import { Cell } from './cell.entity';
import { CELLS_NOT_FOUND, CELL_NOT_FOUND } from './messages';
import { CellSerializer } from './serializers';

@Injectable()
export class CellService {
  constructor(
    @InjectRepository(Cell) private cellRepository: Repository<Cell>,
  ) {}

  async getCellById(id: string): Promise<Cell> {
    const cell = await this.cellRepository.findOne({
      where: { id },
      relations: ['sector', 'sector.district', 'sector.district.province'],
    });

    if (!cell) {
      throw new NotFoundException(CELLS_NOT_FOUND);
    }

    return cell;
  }

  async getCell(id: string): Promise<Cell> {
    const cell = await this.cellRepository.findOne({
      where: { id },
      relations: ['sector'],
      select: {
        sector: {
          id: true,
          name: true,
        },
      },
    });

    if (!cell) {
      throw new NotFoundException(CELLS_NOT_FOUND);
    }

    return cell;
  }

  async getCellsBySectorId(id: string): Promise<Cell[]> {
    const cells = await this.cellRepository.find({
      where: { sector: { id } },
    });
    if (!cells || cells.length === 0) {
      throw new NotFoundException(`${CELLS_NOT_FOUND} ${id}`);
    }

    return cells;
  }

  async getCells(
    filters: ListFilterDTO,
  ): Promise<FilterResponse<CellSerializer>> {
    const listFilterService = new ListFilterService(
      this.cellRepository,
      CellSerializer,
    );

    return listFilterService.filter({ filters, searchFields: ['name'] });
  }

  async getCellByPkid(pkid: number): Promise<Cell> {
    const cell = await this.cellRepository.findOne({ where: { pkid } });

    if (!cell) {
      throw new NotFoundException(CELL_NOT_FOUND);
    }

    return cell;
  }
}
