import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 2 — Daily observation recording (daily_report table redesign).
 *
 * The original daily_report table was built around a freeform GradingLevel
 * entity. Phase 2 replaces it with a rawValue/normalisedScore model that
 * is compatible with the four gradingType strategies introduced in Phase 1
 * (RUBRIC, NUMERIC, YES_NO, FREQUENCY).
 *
 * Changes to daily_report:
 *   1. Drop old FKs (gradingLevelPkid, createdByPkid→staffs, updatedByPkid→staffs)
 *   2. Drop old unique constraint (student, activity, gradingLevel, date)
 *   3. Remove deprecated columns: gradingLevelPkid, createdByPkid, updatedByPkid
 *   4. Rename columns for consistency: activityPkid→activity_id, studentPkid→student_id
 *   5. Add new columns: school_id, rawValue, normalisedScore, created_by_id, updated_by_id
 *   6. Add new FKs
 *   7. Add unique constraint on (student_id, activity_id, date)
 *   8. Seed permissions: read:daily-report, write:daily-report
 *
 * NOTE: existing daily_report rows are preserved (columns that still exist are
 * kept). The new non-nullable columns (rawValue, created_by_id, school_id) are
 * added as nullable first to avoid violating constraints on any pre-existing
 * rows during development. Application-level validation ensures new rows always
 * provide values for these columns.
 */
export class Phase2DailyReportRedesign1772899200000
  implements MigrationInterface
{
  name = 'Phase2DailyReportRedesign1772899200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Drop old foreign-key constraints ───────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "daily_report"
        DROP CONSTRAINT IF EXISTS "FK_e7f7193cd7d5a0f513ba8870d89",
        DROP CONSTRAINT IF EXISTS "FK_2a9e875651eb561684143c442b3",
        DROP CONSTRAINT IF EXISTS "FK_87412dfdb48025d3058caf70524",
        DROP CONSTRAINT IF EXISTS "FK_fee6dfdc6c251f264858cc0ae74",
        DROP CONSTRAINT IF EXISTS "FK_9ec3a61848a6dfa1f34b1c0a02b"
    `);

    // ── 2. Drop old unique constraint ─────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "daily_report"
        DROP CONSTRAINT IF EXISTS "UQ_d177522a293fe486065ec7a7172"
    `);

    // ── 3. Remove deprecated columns ──────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "daily_report"
        DROP COLUMN IF EXISTS "gradingLevelPkid",
        DROP COLUMN IF EXISTS "createdByPkid",
        DROP COLUMN IF EXISTS "updatedByPkid"
    `);

    // ── 4. Rename FK columns for naming-convention consistency ────────────────
    // TypeORM with @JoinColumn({ name: 'activity_id' }) expects 'activity_id'.
    await queryRunner.query(`
      ALTER TABLE "daily_report"
        RENAME COLUMN "activityPkid" TO "activity_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "daily_report"
        RENAME COLUMN "studentPkid" TO "student_id"
    `);

    // ── 5. Add new columns (all nullable for safe rollout) ────────────────────
    await queryRunner.query(`
      ALTER TABLE "daily_report"
        ADD COLUMN IF NOT EXISTS "school_id"       integer,
        ADD COLUMN IF NOT EXISTS "rawValue"        VARCHAR(100),
        ADD COLUMN IF NOT EXISTS "normalisedScore" DECIMAL(5, 2),
        ADD COLUMN IF NOT EXISTS "created_by_id"   integer,
        ADD COLUMN IF NOT EXISTS "updated_by_id"   integer
    `);

    // ── 6. Add new foreign-key constraints ────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "daily_report"
        ADD CONSTRAINT "FK_daily_report_activity_id"
          FOREIGN KEY ("activity_id")
          REFERENCES "activities"("pkid")
          ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "daily_report"
        ADD CONSTRAINT "FK_daily_report_student_id"
          FOREIGN KEY ("student_id")
          REFERENCES "students"("pkid")
          ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "daily_report"
        ADD CONSTRAINT "FK_daily_report_school_id"
          FOREIGN KEY ("school_id")
          REFERENCES "schools"("pkid")
          ON DELETE CASCADE ON UPDATE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "daily_report"
        ADD CONSTRAINT "FK_daily_report_created_by_id"
          FOREIGN KEY ("created_by_id")
          REFERENCES "users"("pkid")
          ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    await queryRunner.query(`
      ALTER TABLE "daily_report"
        ADD CONSTRAINT "FK_daily_report_updated_by_id"
          FOREIGN KEY ("updated_by_id")
          REFERENCES "users"("pkid")
          ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // ── 7. New unique constraint: one observation per student/activity/day ────
    // Partial to handle any NULL student_id / activity_id on old rows.
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_daily_report_student_activity_date"
        ON "daily_report" ("student_id", "activity_id", "date")
        WHERE "student_id" IS NOT NULL
          AND "activity_id" IS NOT NULL
    `);

    // ── 8. Seed permissions ───────────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO "permissions" ("name", "slug") VALUES
        ('Read Daily Report',  'read:daily-report'),
        ('Write Daily Report', 'write:daily-report')
      ON CONFLICT ("slug") DO NOTHING
    `);

    // school-admin — full access
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("rolesPkid", "permissionsPkid")
      SELECT r."pkid", p."pkid"
      FROM   "roles" r
      CROSS JOIN "permissions" p
      WHERE  r."slug" = 'school-admin'
        AND  p."slug" IN ('read:daily-report', 'write:daily-report')
      ON CONFLICT DO NOTHING
    `);

    // teacher — full access (teachers record and review observations)
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("rolesPkid", "permissionsPkid")
      SELECT r."pkid", p."pkid"
      FROM   "roles" r
      CROSS JOIN "permissions" p
      WHERE  r."slug" = 'teacher'
        AND  p."slug" IN ('read:daily-report', 'write:daily-report')
      ON CONFLICT DO NOTHING
    `);

    // parent — read only (parents view their children's timelines)
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("rolesPkid", "permissionsPkid")
      SELECT r."pkid", p."pkid"
      FROM   "roles" r
      CROSS JOIN "permissions" p
      WHERE  r."slug" = 'parent'
        AND  p."slug" IN ('read:daily-report')
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ── Remove seeded permissions ──────────────────────────────────────────
    await queryRunner.query(`
      DELETE FROM "role_permissions"
      WHERE "permissionsPkid" IN (
        SELECT "pkid" FROM "permissions"
        WHERE "slug" IN ('read:daily-report', 'write:daily-report')
      )
    `);

    await queryRunner.query(`
      DELETE FROM "permissions"
      WHERE "slug" IN ('read:daily-report', 'write:daily-report')
    `);

    // ── Drop unique index ──────────────────────────────────────────────────
    await queryRunner.query(`
      DROP INDEX IF EXISTS "public"."UQ_daily_report_student_activity_date"
    `);

    // ── Drop new FKs ───────────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "daily_report"
        DROP CONSTRAINT IF EXISTS "FK_daily_report_updated_by_id",
        DROP CONSTRAINT IF EXISTS "FK_daily_report_created_by_id",
        DROP CONSTRAINT IF EXISTS "FK_daily_report_school_id",
        DROP CONSTRAINT IF EXISTS "FK_daily_report_student_id",
        DROP CONSTRAINT IF EXISTS "FK_daily_report_activity_id"
    `);

    // ── Drop new columns ───────────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "daily_report"
        DROP COLUMN IF EXISTS "updated_by_id",
        DROP COLUMN IF EXISTS "created_by_id",
        DROP COLUMN IF EXISTS "normalisedScore",
        DROP COLUMN IF EXISTS "rawValue",
        DROP COLUMN IF EXISTS "school_id"
    `);

    // ── Restore original column names ──────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "daily_report"
        RENAME COLUMN "student_id" TO "studentPkid"
    `);

    await queryRunner.query(`
      ALTER TABLE "daily_report"
        RENAME COLUMN "activity_id" TO "activityPkid"
    `);

    // ── Restore gradingLevelPkid and staff FKs ─────────────────────────────
    // NOTE: data cannot be restored; this only restores the schema structure.
    await queryRunner.query(`
      ALTER TABLE "daily_report"
        ADD COLUMN IF NOT EXISTS "gradingLevelPkid" integer,
        ADD COLUMN IF NOT EXISTS "createdByPkid"    integer,
        ADD COLUMN IF NOT EXISTS "updatedByPkid"    integer
    `);

    await queryRunner.query(`
      ALTER TABLE "daily_report"
        ADD CONSTRAINT "FK_e7f7193cd7d5a0f513ba8870d89"
          FOREIGN KEY ("activityPkid")
          REFERENCES "activities"("pkid")
          ON DELETE NO ACTION ON UPDATE NO ACTION,
        ADD CONSTRAINT "FK_2a9e875651eb561684143c442b3"
          FOREIGN KEY ("gradingLevelPkid")
          REFERENCES "grading_level"("pkid")
          ON DELETE NO ACTION ON UPDATE NO ACTION,
        ADD CONSTRAINT "FK_87412dfdb48025d3058caf70524"
          FOREIGN KEY ("studentPkid")
          REFERENCES "students"("pkid")
          ON DELETE NO ACTION ON UPDATE NO ACTION,
        ADD CONSTRAINT "FK_fee6dfdc6c251f264858cc0ae74"
          FOREIGN KEY ("createdByPkid")
          REFERENCES "staffs"("pkid")
          ON DELETE NO ACTION ON UPDATE NO ACTION,
        ADD CONSTRAINT "FK_9ec3a61848a6dfa1f34b1c0a02b"
          FOREIGN KEY ("updatedByPkid")
          REFERENCES "staffs"("pkid")
          ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }
}
