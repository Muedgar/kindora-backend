/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { FindManyOptions, FindOptionsOrder, ILike } from 'typeorm';

import { ListFilterDTO } from '../dtos';
import { FilterResponse } from '../interfaces';
import { plainToInstance } from 'class-transformer';

interface FilterDTO extends ListFilterDTO {
  [key: string]: any;
}

interface Filters {
  filters: FilterDTO;
  options?: FindManyOptions;
  searchFields?: string[];
}

export class ListFilterService {
  constructor(
    private repository: any,
    private serializer: any = null,
  ) {}

  async filter({
    filters,
    options = {} as FindManyOptions<any>,
    searchFields = [],
  }: Filters): Promise<FilterResponse<any>> {
    const { page, limit, orderBy, sortOrder, search } = filters;

    if (orderBy) {
      const order = {} as FindOptionsOrder<any>;
      order[orderBy] = sortOrder;
      options.order = order;
    }

    if (search) {
      const where = searchFields.map((field) => {
        const keys = field.split('.');
        const result = {};
        let currentLevel = result;

        keys.forEach((key, index) => {
          if (index === keys.length - 1) {
            currentLevel[key] = ILike(`%${search}%`);
          } else {
            currentLevel[key] = {};
            currentLevel = currentLevel[key];
          }
        });

        return result;
      });

      options.where = where.map((field) => ({
        ...options.where,
        ...field,
      }));
    }

    options.skip = (page - 1) * limit;
    options.take = limit;

    const [data, count] = await this.repository.findAndCount(options);

    return {
      items: plainToInstance(this.serializer, data, {
        excludeExtraneousValues: true,
      }),
      count,
      pages: Math.ceil(count / limit),
      previousPage: page > 1 ? Number(page - 1) : null,
      page: Number(page),
      nextPage: count / limit > page ? Number(page) + 1 : null,
      limit: Number(limit),
    };
  }
}
