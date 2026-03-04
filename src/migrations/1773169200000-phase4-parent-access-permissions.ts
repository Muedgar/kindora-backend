import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 4 parent-access permission verification.
 * Ensures parent role has read slugs required by /parent/* endpoints.
 */
export class Phase4ParentAccessPermissions1773169200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "permissions" ("name", "slug")
      VALUES
        ('Read Notifications', 'read:notifications')
      ON CONFLICT ("slug") DO NOTHING
    `);

    await queryRunner.query(`
      INSERT INTO "role_permissions" ("rolesPkid", "permissionsPkid")
      SELECT r."pkid", p."pkid"
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r."slug" = 'parent'
        AND p."slug" IN (
          'read:students',
          'read:daily-report',
          'read:report-snapshot',
          'read:notifications'
        )
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "role_permissions"
      WHERE "permissionsPkid" IN (
        SELECT "pkid" FROM "permissions"
        WHERE "slug" IN ('read:notifications')
      )
      AND "rolesPkid" IN (
        SELECT "pkid" FROM "roles"
        WHERE "slug" = 'parent'
      )
    `);

    await queryRunner.query(`
      DELETE FROM "permissions"
      WHERE "slug" IN ('read:notifications')
    `);
  }
}
