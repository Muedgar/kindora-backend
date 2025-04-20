import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Permission } from 'src/permissions/entities/permission.entity';
import { Role } from 'src/roles/roles.entity';
import { Repository } from 'typeorm';

@Injectable()
export class RoleSeederService {
  constructor(
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
  ) {}

  async createSuperAdmin(): Promise<Role> {
    const name = 'Super Admin';
    const slug = 'super-admin';

    const existingRole = await this.roleRepository.findOne({
      where: {
        name,
        slug,
      },
    });

    if (existingRole) {
      // delete
      await this.roleRepository.remove(existingRole);
    }

    const allPermissions = await this.permissionRepository.find();

    const superAdmin = this.roleRepository.create({
      name,
      slug,
      permissions: allPermissions,
    });

    const savedSuperAdmin = this.roleRepository.save(superAdmin);

    return savedSuperAdmin;
  }
}
