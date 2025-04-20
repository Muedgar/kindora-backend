/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
import { Injectable, Logger } from '@nestjs/common';
import { RoleSeederService } from './seeder-role.service';

@Injectable()
export class SeederRole {
  constructor(
    private readonly logger: Logger,
    private readonly roleService: RoleSeederService,
  ) {}

  async seed() {
    try {
      await this.loadRoles();
      this.logger.debug('Successfully completed seeding...');
    } catch (err) {
      this.logger.error('Failed seeding...', err);
    }
  }

  async loadRoles() {
    return Promise.all([await this.roleService.createSuperAdmin()])
      .then((createRoles) => {
        this.logger.debug(
          'No. of roles created ' +
            createRoles.filter(
              (nullValueOrCreatedRole) => nullValueOrCreatedRole,
            ).length,
        );
        return Promise.resolve(true);
      })
      .catch((error) => Promise.reject(error));
  }
}
