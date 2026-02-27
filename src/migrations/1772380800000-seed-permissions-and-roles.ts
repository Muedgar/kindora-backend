import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Seed migration — Phase 5 RBAC data.
 *
 * Inserts the 18 canonical permission slugs, the 4 system roles, and
 * links them according to the Kindora permission matrix:
 *
 *   SUPER_ADMIN  — all 18 permissions
 *   SCHOOL_ADMIN — all 18 permissions
 *   TEACHER      — 15 permissions (excludes manage:users, manage:classrooms, manage:school)
 *   PARENT       — 7 permissions  (read-only scoped to own children + send:message)
 *
 * All INSERTs are idempotent via ON CONFLICT DO NOTHING so the migration
 * can be re-run safely in test environments.
 */
export class SeedPermissionsAndRoles1772380800000 implements MigrationInterface {
  name = 'SeedPermissionsAndRoles1772380800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Permissions ────────────────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO "permissions" ("name", "slug") VALUES
        ('Manage Users',          'manage:users'),
        ('Read Users',            'read:users'),
        ('Manage Classrooms',     'manage:classrooms'),
        ('Read Classrooms',       'read:classrooms'),
        ('Manage Students',       'manage:students'),
        ('Read Students',         'read:students'),
        ('Write Lesson',          'write:lesson'),
        ('Read Lesson',           'read:lesson'),
        ('Write Observation',     'write:observation'),
        ('Read Observation',      'read:observation'),
        ('Manage Attendance',     'manage:attendance'),
        ('Read Attendance',       'read:attendance'),
        ('Upload Media',          'upload:media'),
        ('Read Media',            'read:media'),
        ('Send Message',          'send:message'),
        ('Publish Announcement',  'publish:announcement'),
        ('Manage School',         'manage:school'),
        ('Read Reports',          'read:reports')
      ON CONFLICT ("slug") DO NOTHING
    `);

    // ── 2. Roles ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      INSERT INTO "roles" ("name", "slug") VALUES
        ('Super Admin',  'super-admin'),
        ('School Admin', 'school-admin'),
        ('Teacher',      'teacher'),
        ('Parent',       'parent')
      ON CONFLICT ("slug") DO NOTHING
    `);

    // ── 3. Role–permission links ───────────────────────────────────────────────

    // SUPER_ADMIN — all 18 permissions
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("rolesPkid", "permissionsPkid")
      SELECT r."pkid", p."pkid"
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r."slug" = 'super-admin'
      ON CONFLICT DO NOTHING
    `);

    // SCHOOL_ADMIN — all 18 permissions
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("rolesPkid", "permissionsPkid")
      SELECT r."pkid", p."pkid"
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r."slug" = 'school-admin'
      ON CONFLICT DO NOTHING
    `);

    // TEACHER — 15 permissions (everything except manage:users, manage:classrooms, manage:school)
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("rolesPkid", "permissionsPkid")
      SELECT r."pkid", p."pkid"
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r."slug" = 'teacher'
        AND p."slug" IN (
          'read:users',
          'read:classrooms',
          'manage:students',
          'read:students',
          'write:lesson',
          'read:lesson',
          'write:observation',
          'read:observation',
          'manage:attendance',
          'read:attendance',
          'upload:media',
          'read:media',
          'send:message',
          'publish:announcement',
          'read:reports'
        )
      ON CONFLICT DO NOTHING
    `);

    // PARENT — 7 permissions (own-children reads + send:message)
    // Note: service layer must further scope read:* endpoints to the parent's children.
    await queryRunner.query(`
      INSERT INTO "role_permissions" ("rolesPkid", "permissionsPkid")
      SELECT r."pkid", p."pkid"
      FROM "roles" r
      CROSS JOIN "permissions" p
      WHERE r."slug" = 'parent'
        AND p."slug" IN (
          'read:students',
          'read:lesson',
          'read:observation',
          'read:attendance',
          'read:media',
          'send:message',
          'read:reports'
        )
      ON CONFLICT DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove role–permission links for the seeded roles first.
    await queryRunner.query(`
      DELETE FROM "role_permissions"
      WHERE "rolesPkid" IN (
        SELECT "pkid" FROM "roles"
        WHERE "slug" IN ('super-admin', 'school-admin', 'teacher', 'parent')
      )
    `);

    // Remove the seeded roles.
    await queryRunner.query(`
      DELETE FROM "roles"
      WHERE "slug" IN ('super-admin', 'school-admin', 'teacher', 'parent')
    `);

    // Remove the seeded permissions.
    await queryRunner.query(`
      DELETE FROM "permissions"
      WHERE "slug" IN (
        'manage:users', 'read:users',
        'manage:classrooms', 'read:classrooms',
        'manage:students', 'read:students',
        'write:lesson', 'read:lesson',
        'write:observation', 'read:observation',
        'manage:attendance', 'read:attendance',
        'upload:media', 'read:media',
        'send:message', 'publish:announcement',
        'manage:school', 'read:reports'
      )
    `);
  }
}
