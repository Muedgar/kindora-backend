import { MigrationInterface, QueryRunner } from 'typeorm';

export class Phase4DeliveryMediaNotifications1773255600000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "daily_report"
        ADD COLUMN IF NOT EXISTS "mediaId" uuid,
        ADD COLUMN IF NOT EXISTS "mediaPreviewUrl" varchar(2048)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_daily_report_parent_timeline"
        ON "daily_report" ("school_id", "student_id", "date" DESC, "pkid" DESC)
        WHERE "visibleToParents" = true
    `);

    await queryRunner.query(`
      ALTER TABLE "report_snapshots"
        ADD COLUMN IF NOT EXISTS "sentAt" timestamptz
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_report_snapshots_parent_inbox"
        ON "report_snapshots" ("school_id", "status", "publishedAt" DESC, "periodEnd" DESC)
        WHERE "status" IN ('PUBLISHED', 'SENT')
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "device_tokens" (
        "pkid" SERIAL NOT NULL,
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "version" INTEGER NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "user_id" INTEGER NOT NULL,
        "platform" VARCHAR(20) NOT NULL,
        "provider" VARCHAR(30) NOT NULL DEFAULT 'fcm',
        "token" VARCHAR(1024) NOT NULL,
        CONSTRAINT "PK_device_tokens" PRIMARY KEY ("pkid"),
        CONSTRAINT "UQ_device_tokens_id" UNIQUE ("id"),
        CONSTRAINT "UQ_device_tokens_user_token" UNIQUE ("user_id", "token"),
        CONSTRAINT "FK_device_tokens_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("pkid") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_device_tokens_user_id"
        ON "device_tokens" ("user_id")
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "pkid" SERIAL NOT NULL,
        "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
        "version" INTEGER NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "user_id" INTEGER NOT NULL,
        "type" VARCHAR(30) NOT NULL,
        "title" VARCHAR(200) NOT NULL,
        "body" TEXT NOT NULL,
        "relatedEntityId" VARCHAR(36),
        "isRead" BOOLEAN NOT NULL DEFAULT false,
        CONSTRAINT "PK_notifications" PRIMARY KEY ("pkid"),
        CONSTRAINT "UQ_notifications_id" UNIQUE ("id"),
        CONSTRAINT "FK_notifications_user"
          FOREIGN KEY ("user_id") REFERENCES "users"("pkid") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_parent_inbox"
        ON "notifications" ("user_id", "isRead", "createdAt" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_notifications_parent_inbox"
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "notifications"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_device_tokens_user_id"
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "device_tokens"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_report_snapshots_parent_inbox"
    `);
    await queryRunner.query(`
      ALTER TABLE "report_snapshots"
        DROP COLUMN IF EXISTS "sentAt"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_daily_report_parent_timeline"
    `);
    await queryRunner.query(`
      ALTER TABLE "daily_report"
        DROP COLUMN IF EXISTS "mediaPreviewUrl",
        DROP COLUMN IF EXISTS "mediaId"
    `);
  }
}
