import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 3 migration — Report Snapshot Engine
 *
 * Creates:
 *   • report_snapshots   — envelope (student, period, status, headline scores)
 *   • snapshot_activity_items — per-activity breakdown within a snapshot
 *
 * Seeds:
 *   • Permissions: read:report-snapshot, write:report-snapshot, publish:report-snapshot
 *   • Role grants:
 *       school-admin  → all three
 *       teacher       → read + write (publish requires explicit grant from admin)
 *       parent        → read only (guardian-scoping enforced at service layer)
 */
export class Phase3ReportSnapshots1772985600000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── report_snapshots ─────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "report_snapshots" (
        "pkid"                SERIAL        NOT NULL,
        "id"                  UUID          NOT NULL DEFAULT uuid_generate_v4(),
        "version"             INTEGER       NOT NULL DEFAULT 1,
        "createdAt"           TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updatedAt"           TIMESTAMPTZ   NOT NULL DEFAULT now(),

        "school_id"           INTEGER       NOT NULL,
        "student_id"          INTEGER       NOT NULL,

        "type"                VARCHAR(20)   NOT NULL,
        "periodStart"         DATE          NOT NULL,
        "periodEnd"           DATE          NOT NULL,

        "totalObservations"   INTEGER       NOT NULL DEFAULT 0,
        "overallScore"        DECIMAL(5,2)  NULL,
        "trend"               VARCHAR(20)   NULL,

        "status"              VARCHAR(20)   NOT NULL DEFAULT 'DRAFT',
        "teacherNotes"        TEXT          NULL,
        "reviewed_by_id"      INTEGER       NULL,
        "reviewedAt"          TIMESTAMPTZ   NULL,
        "publishedAt"         TIMESTAMPTZ   NULL,

        "created_by_id"       INTEGER       NOT NULL,
        "updated_by_id"       INTEGER       NULL,

        CONSTRAINT "PK_report_snapshots" PRIMARY KEY ("pkid"),
        CONSTRAINT "UQ_report_snapshots_id" UNIQUE ("id"),

        -- One non-published snapshot per student per period per type.
        -- Published ones are kept for audit; uniqueness is enforced at the
        -- service layer for published entries.
        CONSTRAINT "UQ_snapshot_student_type_period"
          UNIQUE ("student_id", "type", "periodStart", "periodEnd"),

        CONSTRAINT "FK_report_snapshots_school"
          FOREIGN KEY ("school_id") REFERENCES "schools"("pkid") ON DELETE CASCADE,
        CONSTRAINT "FK_report_snapshots_student"
          FOREIGN KEY ("student_id") REFERENCES "students"("pkid") ON DELETE CASCADE,
        CONSTRAINT "FK_report_snapshots_reviewed_by"
          FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("pkid") ON DELETE SET NULL,
        CONSTRAINT "FK_report_snapshots_created_by"
          FOREIGN KEY ("created_by_id") REFERENCES "users"("pkid"),
        CONSTRAINT "FK_report_snapshots_updated_by"
          FOREIGN KEY ("updated_by_id") REFERENCES "users"("pkid") ON DELETE SET NULL
      )
    `);

    // Index: list snapshots for a student quickly (parent app home screen)
    await queryRunner.query(`
      CREATE INDEX "IDX_report_snapshots_student_id"
        ON "report_snapshots" ("student_id", "periodStart" DESC)
    `);

    // Index: teacher dashboard — list by school + status
    await queryRunner.query(`
      CREATE INDEX "IDX_report_snapshots_school_status"
        ON "report_snapshots" ("school_id", "status", "periodStart" DESC)
    `);

    // ── snapshot_activity_items ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE "snapshot_activity_items" (
        "pkid"                SERIAL        NOT NULL,
        "id"                  UUID          NOT NULL DEFAULT uuid_generate_v4(),
        "version"             INTEGER       NOT NULL DEFAULT 1,
        "createdAt"           TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updatedAt"           TIMESTAMPTZ   NOT NULL DEFAULT now(),

        "snapshot_id"         INTEGER       NOT NULL,
        "activity_id"         INTEGER       NOT NULL,
        "learning_area_id"    INTEGER       NULL,
        "learningAreaName"    VARCHAR(100)  NULL,

        "observationCount"    INTEGER       NOT NULL DEFAULT 0,
        "averageScore"        DECIMAL(5,2)  NULL,
        "firstScore"          DECIMAL(5,2)  NULL,
        "lastScore"           DECIMAL(5,2)  NULL,
        "trend"               VARCHAR(20)   NULL,
        "latestRawValue"      VARCHAR(100)  NULL,

        CONSTRAINT "PK_snapshot_activity_items" PRIMARY KEY ("pkid"),
        CONSTRAINT "UQ_snapshot_activity_items_id" UNIQUE ("id"),

        CONSTRAINT "FK_snapshot_items_snapshot"
          FOREIGN KEY ("snapshot_id") REFERENCES "report_snapshots"("pkid") ON DELETE CASCADE,
        CONSTRAINT "FK_snapshot_items_activity"
          FOREIGN KEY ("activity_id") REFERENCES "activities"("pkid"),
        CONSTRAINT "FK_snapshot_items_learning_area"
          FOREIGN KEY ("learning_area_id") REFERENCES "learning_areas"("pkid") ON DELETE SET NULL
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_snapshot_activity_items_snapshot_id"
        ON "snapshot_activity_items" ("snapshot_id")
    `);

    // ── Permissions ──────────────────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO "permissions" ("name", "slug", "description")
      VALUES
        ('Read Report Snapshot',    'read:report-snapshot',    'View generated report snapshots'),
        ('Write Report Snapshot',   'write:report-snapshot',   'Generate and review report snapshots'),
        ('Publish Report Snapshot', 'publish:report-snapshot', 'Publish snapshots to parents/guardians')
      ON CONFLICT ("slug") DO NOTHING
    `);

    // ── Role grants ──────────────────────────────────────────────────────────
    // school-admin: full access
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("roleId", "permissionId")
      SELECT r.id, p.id
      FROM "roles" r, "permissions" p
      WHERE r.slug = 'school-admin'
        AND p.slug IN (
          'read:report-snapshot',
          'write:report-snapshot',
          'publish:report-snapshot'
        )
      ON CONFLICT DO NOTHING
    `);

    // teacher: generate + review, but NOT publish
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("roleId", "permissionId")
      SELECT r.id, p.id
      FROM "roles" r, "permissions" p
      WHERE r.slug = 'teacher'
        AND p.slug IN (
          'read:report-snapshot',
          'write:report-snapshot'
        )
      ON CONFLICT DO NOTHING
    `);

    // parent: read only — guardian-scoping enforced at the service layer
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("roleId", "permissionId")
      SELECT r.id, p.id
      FROM "roles" r, "permissions" p
      WHERE r.slug = 'parent'
        AND p.slug IN ('read:report-snapshot')
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove role–permission links
    await queryRunner.query(`
      DELETE FROM "role_permissions"
      WHERE "permissionId" IN (
        SELECT id FROM "permissions"
        WHERE slug IN (
          'read:report-snapshot',
          'write:report-snapshot',
          'publish:report-snapshot'
        )
      )
    `);

    // Remove permissions
    await queryRunner.query(`
      DELETE FROM "permissions"
      WHERE slug IN (
        'read:report-snapshot',
        'write:report-snapshot',
        'publish:report-snapshot'
      )
    `);

    await queryRunner.query(`DROP TABLE IF EXISTS "snapshot_activity_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "report_snapshots"`);
  }
}
