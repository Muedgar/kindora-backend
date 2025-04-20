/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ListFilterDTO } from 'src/common/dtos';
import { FilterResponse } from 'src/common/interfaces';
import { FindManyOptions, Repository } from 'typeorm';
import { CreateRoleDTO, UpdateRoleDTO } from './dtos';
import {
  ROLE_ALREADY_ACTIVATED,
  ROLE_ALREADY_DEACTIVATED,
  ROLE_EXISTS,
  ROLE_NOT_FOUND,
} from './messages';
import { Role } from './roles.entity';
import { RoleSerializer } from './serializers';
import { PermissionsService } from 'src/permissions/permissions.service';
import { Permission } from 'src/permissions/entities/permission.entity';
import { ListFilterService } from 'src/common/services/list-filter.service';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role) private roleRepository: Repository<Role>,
    private permissionService: PermissionsService,
  ) {}

  private async doesRoleExists(name: string) {
    const role = await this.roleRepository.findOne({ where: { name } });
    if (role) {
      throw new ConflictException(ROLE_EXISTS);
    }
  }

  private async getPermissions(ids: string[]): Promise<Permission[]> {
    const permissions: Permission[] = [];
    for (const id of ids) {
      const permission = await this.permissionService.getPermission(id);
      permissions.push(permission);
    }

    return permissions;
  }

  async createRole(createRoleDTO: CreateRoleDTO): Promise<RoleSerializer> {
    const permissions = await this.getPermissions(createRoleDTO.permissions);
    const roleData = { ...createRoleDTO, permissions, slug: '' };
    roleData.name = roleData.name.toLowerCase();
    roleData.slug = roleData.name.replace(/\s+/g, '-').toLowerCase();

    await this.doesRoleExists(roleData.name);

    const role = this.roleRepository.create({ ...roleData });
    const savedRole = await this.roleRepository.save(role);

    return new RoleSerializer(savedRole);
  }

  async getRole(id: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: ['permissions'],
      select: {
        permissions: {
          id: true,
          name: true,
        },
      },
    });
    if (!role) {
      throw new NotFoundException(ROLE_NOT_FOUND);
    }
    return role;
  }

  async getRoleBySlug(slug: string): Promise<Role> {
    const role = await this.roleRepository.findOne({
      where: { slug },
      relations: ['permissions'],
      select: {
        permissions: {
          id: true,
          name: true,
        },
      },
    });
    if (!role) {
      throw new NotFoundException(ROLE_NOT_FOUND);
    }
    return role;
  }

  async getRoles(
    filters: ListFilterDTO,
  ): Promise<FilterResponse<RoleSerializer>> {
    const listFilterService = new ListFilterService(
      this.roleRepository,
      RoleSerializer,
    );

    const options: FindManyOptions<Role> = { relations: ['permissions'] };

    return listFilterService.filter({
      filters,
      searchFields: ['name'],
      options,
    });
  }

  async updateRole(
    id: string,
    updateRoleDTO: UpdateRoleDTO,
  ): Promise<RoleSerializer> {
    const role = await this.getRole(id);

    if (updateRoleDTO.name) {
      const existingRole = await this.roleRepository.findOne({
        where: { name: updateRoleDTO.name },
      });
      if (existingRole && role.id !== existingRole.id) {
        throw new ConflictException(ROLE_EXISTS);
      }

      role.name = updateRoleDTO.name;
      role.slug = updateRoleDTO.name.replace(/\s+/g, '-').toLowerCase();
    }

    if (updateRoleDTO.permissions) {
      const permissions = await this.getPermissions(updateRoleDTO.permissions);

      if (permissions) {
        role.permissions = permissions;
      }
    }

    const updatedRole = await this.roleRepository.save(role);
    return new RoleSerializer(updatedRole);
  }

  async deleteRole(id: string): Promise<void> {
    const role = await this.getRole(id);
    await this.roleRepository.remove(role);
  }

  async activateRole(id: string): Promise<RoleSerializer> {
    const role = await this.getRole(id);
    if (role.status) {
      throw new BadRequestException(ROLE_ALREADY_ACTIVATED);
    }

    role.status = true;
    const savedRole = await this.roleRepository.save(role);

    return new RoleSerializer(savedRole);
  }

  async deactivateRole(id: string): Promise<RoleSerializer> {
    const role = await this.getRole(id);
    if (!role.status) {
      throw new BadRequestException(ROLE_ALREADY_DEACTIVATED);
    }

    role.status = false;
    const savedRole = await this.roleRepository.save(role);

    return new RoleSerializer(savedRole);
  }
}
