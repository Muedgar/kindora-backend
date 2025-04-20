/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Permission } from './entities/permission.entity';
import { Repository } from 'typeorm';
import { PERMISSION_NOT_FOUND } from './constants';
import { ListFilterDTO } from 'src/common/dtos';
import { FilterResponse } from 'src/common/interfaces';
import { PermissionSerializer } from './serializers';
import { ListFilterService } from 'src/common/services/list-filter.service';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
  ) {}

  async getPermission(id: string): Promise<Permission> {
    const permission = await this.permissionRepository.findOne({
      where: { id },
    });

    if (!permission) {
      throw new NotFoundException(PERMISSION_NOT_FOUND);
    }

    return permission;
  }

  async getPermissions(
    filters: ListFilterDTO,
  ): Promise<FilterResponse<PermissionSerializer>> {
    const listFilterService = new ListFilterService(
      this.permissionRepository,
      PermissionSerializer,
    );

    return listFilterService.filter({
      filters,
      searchFields: ['name', 'slug'],
    });
  }
}
