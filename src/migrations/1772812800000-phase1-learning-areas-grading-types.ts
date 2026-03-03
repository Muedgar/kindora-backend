import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 1 — Data Model Foundations
 *
 * Introduces the core building blocks for the Reports & Development module:
 *
 * 1. `learning_areas` table
 *    Top-level organisational groupings (e.g. "Language & Literacy",
 *    "Motor Skills"). Each belongs to one school (multi-tenant).
 *
 * 2. `learning_area_activities` join table
 *    Many-to-many between learning_areas and activities.
 *
 * 3. Alter `activities` table
 *    a. Add `school_id` FK — every activity is now scoped to a school.
 *    b. Drop the global unique constraint on `name`; replace with a
 *       per-school composite unique index.
 *    c. Add `grading_type` VARCHAR(20) DEFAULT 'RUBRIC' — measurement
 *       strategy (RUBRIC | NUMERIC | YES_NO | FREQUENCY).
 *    d. Add `grading_config` JSONB — type-specific config (nullable).
 *    e. Widen `description` from VARCHAR(100) to VARCHAR(500).
 *
 * 4. Seed permissions
 *    read:activity, write:activity, read:learning-area, write:learning-area
 *    → granted to school-admin and teacher roles.
 *
 * NOTE: `school_id` on activities is added as nullable to avoid constraint
 * violations on any pre-existing rows. New rows must always supply a school.
 */
export class Phase1LearningAreasGradingTypes1772812800000
  implements MigrationInterface
{
  name = 'Phase1LearningAreasGradingTypes1772812800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Create learning_areas ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "learning_areas" (
        "pkid"           SERIAL        NOT NULL,
        "id"             uuid          NOT NULL DEFAULT uuid_generate_v4(),
        "version"        integer       NOT NULL DEFAULT '1',
        "createdAt"      TIMESTAMP     NOT NULL DEFAULT now(),
        "updatedAt"      TIMESTAMP     NOT NULL DEFAULT now(),
        "name"           VARCHAR(100)  NOT NULL,
        "description"    VARCHAR(500),
        "school_id"      integer       NOT NULL,
        "created_by_id"  integer       NOT NULL,
        CONSTRAINT "UQ_learning_areas_id"          UNIQUE ("id"),
        CONSTRAINT "UQ_learning_area_school_name"  UNIQUE ("school_id", "name"),
        CONSTRAINT "PK_learning_areas"             PRIMARY KEY ("pkid")
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "learning_areas"
        ADD CONSTRAINT "FK_learning_areas_school_id"
          FOREIGN KEY ("school_id")
          REFERENCES "schools"("pkid")
          ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "learning_areas"
        ADD CONSTRAINT "FK_learning_areas_created_by_id"
          FOREIGN KEY ("created_by_id")
          REFERENCES "users"("pkid")
          ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // ── 2. Create learning_area_activities join table ─────────────────────────
    await queryRunner.query(`
      CREATE TABLE "learning_area_activities" (
        "learning_area_id"  uuid  NOT NULL,
        "activity_id"       uuid  NOT NULL,
        CONSTRAINT "PK_learning_area_activities"
          PRIMARY KEY ("learning_area_id", "activity_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_learning_area_activities_area"
        ON "learning_area_activities" ("learning_area_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_learning_area_activities_activity"
        ON "learning_area_activities" ("activity_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "learning_area_activities"
        ADD CONSTRAINT "FK_learning_area_activities_area"
          FOREIGN KEY ("learning_area_id")
          REFERENCES "learning_areas"("id")
          ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "learning_area_activities"
        ADD CONSTRAINT "FK_learning_area_activities_activity"
          FOREIGN KEY ("activity_id")
          REFERENCES "activities"("id")
          ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // ── 3a. Add school_id to activities (nullable for safe rollout) ───────────
    await queryRunner.query(`
      ALTER TABLE "activities"
        ADD COLUMN IF NOT EXISTS "school_id" integer
    `);

    await queryRunner.query(`
      ALTER TABLE "activities"
        ADD CONSTRAINT "FK_activities_school_id"
          FOREIGN KEY ("school_id")
          REFERENCES "schools"("pkid")
          ON DELETE CASCADE ON UPDATE CASCADE
    `);

    // ── 3b. Swap global name unique → per-school composite unique index ───────
    // The original constraint was auto-named by TypeORM.
    await queryRunner.query(`
      ALTER TABLE "activities"
        DROP CONSTRAINT IF EXISTS "UQ_a7455bc944cd82d40cc41e83c46"
    `);

    // Partial index so existing NULL school_id rows are not compared.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_activities_school_id_name"
        ON "activities" ("school_id", "name")
        WHERE "school_id" IS NOT NULL
    `);

    // ── 3c. Add grading_type column ───────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "activities"
        ADD COLUMN IF NOT EXISTS "grading_type" VARCHAR(20) NOT NULL DEFAULT 'RUBRIC'
    `);

    // ── 3d. Add grading_config column ─────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "activities"
        ADD COLUMN IF NOT EXISTS "grading_config" jsonb
    `);

    // ── 3e. Widen description from VARCHAR(100) → VARCHAR(500) ────────────────
    await queryRunner.query(`
      ALTER TABLE "activities"
        ALTER COLUMN "description" TYPE VARCHAR(500)
    `);

    // ── 4. Seed permissions ───────────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO "permissions" ("name", "slug") VALUES
        ('Read Activity',      'read:activity'),
        ('Write Activity',     'write:activity'),
        ('Read Learning Area', 'read:learning-area'),
        ('Write Learning Area','write:learning-area')
      ON CONFLICT ("slug") DO NOTHING
    `);

    // school-admin — full access to activities and learning areas
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("rolesPkid", "permissionsPkid")
      SELECT r."pkid", p."pkid"
      FROM   "roles" r
      CROSS JOIN "permissions" p
      WHERE  r."slug" = 'school-admin'
        AND  p."slug" IN (
          'read:activity', 'write:activity',
          'read:learning-area', 'write:learning-area'
        )
      ON CONFLICT DO NOTHING
    `);

    // teacher — full access (teachers record activities; school admins curate)
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("rolesPkid", "permissionsPkid")
      SELECT r."pkid", p."pkid"
      FROM   "roles" r
      CROSS JOIN "permissions" p
      WHERE  r."slug" = 'teacher'
        AND  p."slug" IN (
          'read:activity', 'write:activity',
          'read:learning-area', 'write:learning-area'
        )
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ── 4. Remove seeded permissions ──────────────────────────────────────────
    await queryRunner.query(`
      DELETE FROM "role_permissions"
      WHERE "permissionsPkid" IN (
        SELECT "pkid" FROM "permissions"
        WHERE "slug" IN (
          'read:activity', 'write:activity',
          'read:learning-area', 'write:learning-area'
        )
      )
    `);

    await queryRunner.query(`
      DELETE FROM "permissions"
      WHERE "slug" IN (
        'read:activity', 'write:activity',
        'read:learning-area', 'write:learning-area'
      )
    `);

    // ── 3. Revert activities alterations ──────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "activities"
        ALTER COLUMN "description" TYPE VARCHAR(100)
    `);

    await queryRunner.query(`
      ALTER TABLE "activities"
        DROP COLUMN IF EXISTS "grading_config"
    `);

    await queryRunner.query(`
      ALTER TABLE "activities"
        DROP COLUMN IF EXISTS "grading_type"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "public"."UQ_activities_school_id_name"
    `);

    // Restore global unique constraint on name (only safe if no duplicates exist)
    await queryRunner.query(`
      ALTER TABLE "activities"
        ADD CONSTRAINT "UQ_a7455bc944cd82d40cc41e83c46" UNIQUE ("name")
    `);

    await queryRunner.query(`
      ALTER TABLE "activities"
        DROP CONSTRAINT IF EXISTS "FK_activities_school_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "activities"
        DROP COLUMN IF EXISTS "school_id"
    `);

    // ── 2. Drop learning_area_activities join table ───────────────────────────
    await queryRunner.query(`
      ALTER TABLE "learning_area_activities"
        DROP CONSTRAINT IF EXISTS "FK_learning_area_activities_activity"
    `);

    await queryRunner.query(`
      ALTER TABLE "learning_area_activities"
        DROP CONSTRAINT IF EXISTS "FK_learning_area_activities_area"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "public"."IDX_learning_area_activities_activity"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "public"."IDX_learning_area_activities_area"
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "learning_area_activities"`);

    // ── 1. Drop learning_areas ────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "learning_areas"
        DROP CONSTRAINT IF EXISTS "FK_learning_areas_created_by_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "learning_areas"
        DROP CONSTRAINT IF EXISTS "FK_learning_areas_school_id"
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "learning_areas"`);
  }
}
