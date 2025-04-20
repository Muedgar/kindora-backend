/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
import { Injectable, Logger } from '@nestjs/common';
import { PermissionSeederService } from './seeder.service';

@Injectable()
export class Seeder {
  constructor(
    private readonly logger: Logger,
    private readonly permissionService: PermissionSeederService,
  ) {}

  async seed() {
    try {
      await this.loadPermissions();
      this.logger.debug('Successfully completed seeding...');
    } catch (err) {
      this.logger.error('Failed seeding...', err);
    }
  }

  async loadPermissions() {
    return Promise.all(await this.permissionService.createPermission())
      .then((createdPermissions) => {
        this.logger.debug(
          'No. of permissions created ' +
            createdPermissions.filter(
              (nullValueOrCreatedPermission) => nullValueOrCreatedPermission,
            ).length,
        );
        return Promise.resolve(true);
      })
      .catch((error) => Promise.reject(error));
  }
}
