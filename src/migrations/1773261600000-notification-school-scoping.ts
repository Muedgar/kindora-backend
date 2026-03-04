import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationSchoolScoping1773261600000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "notifications"
        ADD COLUMN IF NOT EXISTS "school_id" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "device_tokens"
        ADD COLUMN IF NOT EXISTS "school_id" integer
    `);

    // Backfill existing rows so legacy notifications/tokens stay visible
    // after school-scoped inbox queries are enforced.
    await queryRunner.query(`
      UPDATE "notifications" n
      SET "school_id" = p."school_id"
      FROM "parents" p
      WHERE n."school_id" IS NULL
        AND n."user_id" = p."user_id"
    `);
    await queryRunner.query(`
      UPDATE "device_tokens" dt
      SET "school_id" = p."school_id"
      FROM "parents" p
      WHERE dt."school_id" IS NULL
        AND dt."user_id" = p."user_id"
    `);
    await queryRunner.query(`
      UPDATE "notifications" n
      SET "school_id" = sm."school_id"
      FROM (
        SELECT DISTINCT ON ("user_id") "user_id", "school_id"
        FROM "school_members"
        ORDER BY "user_id", "lastSelectedAt" DESC NULLS LAST, "pkid" DESC
      ) sm
      WHERE n."school_id" IS NULL
        AND n."user_id" = sm."user_id"
    `);
    await queryRunner.query(`
      UPDATE "device_tokens" dt
      SET "school_id" = sm."school_id"
      FROM (
        SELECT DISTINCT ON ("user_id") "user_id", "school_id"
        FROM "school_members"
        ORDER BY "user_id", "lastSelectedAt" DESC NULLS LAST, "pkid" DESC
      ) sm
      WHERE dt."school_id" IS NULL
        AND dt."user_id" = sm."user_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "notifications"
        DROP CONSTRAINT IF EXISTS "FK_notifications_school"
    `);
    await queryRunner.query(`
      ALTER TABLE "notifications"
        ADD CONSTRAINT "FK_notifications_school"
        FOREIGN KEY ("school_id") REFERENCES "schools"("pkid")
        ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "device_tokens"
        DROP CONSTRAINT IF EXISTS "FK_device_tokens_school"
    `);
    await queryRunner.query(`
      ALTER TABLE "device_tokens"
        ADD CONSTRAINT "FK_device_tokens_school"
        FOREIGN KEY ("school_id") REFERENCES "schools"("pkid")
        ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_notifications_parent_inbox"
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_school_user_inbox"
        ON "notifications" ("school_id", "user_id", "isRead", "createdAt" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_device_tokens_school_user"
        ON "device_tokens" ("school_id", "user_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "device_tokens"
        DROP CONSTRAINT IF EXISTS "UQ_device_tokens_user_token"
    `);
    await queryRunner.query(`
      ALTER TABLE "device_tokens"
        DROP CONSTRAINT IF EXISTS "UQ_device_tokens_user_school_token"
    `);
    await queryRunner.query(`
      ALTER TABLE "device_tokens"
        ADD CONSTRAINT "UQ_device_tokens_user_school_token"
        UNIQUE ("user_id", "school_id", "token")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "device_tokens"
        DROP CONSTRAINT IF EXISTS "UQ_device_tokens_user_school_token"
    `);
    await queryRunner.query(`
      ALTER TABLE "device_tokens"
        ADD CONSTRAINT "UQ_device_tokens_user_token"
        UNIQUE ("user_id", "token")
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_device_tokens_school_user"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_notifications_school_user_inbox"
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_parent_inbox"
        ON "notifications" ("user_id", "isRead", "createdAt" DESC)
    `);

    await queryRunner.query(`
      ALTER TABLE "device_tokens"
        DROP CONSTRAINT IF EXISTS "FK_device_tokens_school"
    `);
    await queryRunner.query(`
      ALTER TABLE "notifications"
        DROP CONSTRAINT IF EXISTS "FK_notifications_school"
    `);

    await queryRunner.query(`
      ALTER TABLE "device_tokens"
        DROP COLUMN IF EXISTS "school_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "notifications"
        DROP COLUMN IF EXISTS "school_id"
    `);
  }
}
