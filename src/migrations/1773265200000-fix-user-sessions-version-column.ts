import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hotfix: align user_sessions table with AppBaseEntity contract.
 *
 * UserSession extends AppBaseEntity, which requires:
 *   - id
 *   - version (VersionColumn, default 1)
 *   - createdAt
 *   - updatedAt
 *
 * Some environments created user_sessions without "version", causing inserts to fail.
 */
export class FixUserSessionsVersionColumn1773265200000
  implements MigrationInterface
{
  name = 'FixUserSessionsVersionColumn1773265200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_sessions"
      ADD COLUMN IF NOT EXISTS "version" INTEGER
    `);

    await queryRunner.query(`
      UPDATE "user_sessions"
      SET "version" = 1
      WHERE "version" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "user_sessions"
      ALTER COLUMN "version" SET DEFAULT 1,
      ALTER COLUMN "version" SET NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "user_sessions"
      DROP COLUMN IF EXISTS "version"
    `);
  }
}

