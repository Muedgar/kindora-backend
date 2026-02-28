import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 9 — Audit logging permission.
 *
 * Adds the `read:audit-logs` permission and grants it to:
 *   - super-admin  (all permissions by policy)
 *   - school-admin (school-level audit access)
 *
 * Teacher and Parent roles do NOT receive this permission.
 */
export class AddAuditLogsPermission1772553600000 implements MigrationInterface {
  name = 'AddAuditLogsPermission1772553600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Insert permission ───────────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO "permissions" ("name", "slug") VALUES
        ('Read Audit Logs', 'read:audit-logs')
      ON CONFLICT ("slug") DO NOTHING
    `);

    // ── 2. Grant to super-admin and school-admin ───────────────────────────────
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("rolesPkid", "permissionsPkid")
      SELECT r."pkid", p."pkid"
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r."slug" IN ('super-admin', 'school-admin')
        AND p."slug" = 'read:audit-logs'
      ON CONFLICT DO NOTHING
    `);

    // ── 3. Create the audit_logs table ────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "pkid"        SERIAL        PRIMARY KEY,
        "id"          UUID          NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
        "actor_id"    INTEGER       REFERENCES "users"("pkid") ON DELETE SET NULL,
        "school_id"   INTEGER       REFERENCES "schools"("pkid") ON DELETE SET NULL,
        "action"      VARCHAR(100)  NOT NULL,
        "resource"    VARCHAR(100)  NOT NULL,
        "resourceId"  VARCHAR,
        "payload"     JSONB,
        "result"      JSONB,
        "ipAddress"   VARCHAR(45),
        "createdAt"   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `);

    // Index for the most common query: list by school, newest first.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_audit_logs_school_created"
      ON "audit_logs" ("school_id", "createdAt" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the table
    await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs"`);

    // Remove role-permission links
    await queryRunner.query(`
      DELETE FROM "role_permissions"
      WHERE "permissionsPkid" IN (
        SELECT "pkid" FROM "permissions" WHERE "slug" = 'read:audit-logs'
      )
    `);

    // Remove the permission
    await queryRunner.query(`
      DELETE FROM "permissions" WHERE "slug" = 'read:audit-logs'
    `);
  }
}
