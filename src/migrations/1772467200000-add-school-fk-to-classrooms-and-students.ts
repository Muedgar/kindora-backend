import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 6 — Tenant scoping.
 *
 * Adds a direct school_id FK to both classrooms and students.
 * This denormalises the school reference (previously reachable only via
 * branch → school) so that every list/find query can apply a simple
 * WHERE school_id = $1 without a JOIN through school_branches.
 *
 * Migration steps:
 *   1. Add nullable school_id column (avoids constraint violation on existing rows).
 *   2. Backfill from the existing branch → school relationship.
 *   3. Add NOT NULL constraint + FK constraint.
 */
export class AddSchoolFkToClassroomsAndStudents1772467200000
  implements MigrationInterface
{
  name = 'AddSchoolFkToClassroomsAndStudents1772467200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── classrooms ────────────────────────────────────────────────────────────

    // 1a. Add nullable column
    await queryRunner.query(`
      ALTER TABLE "classrooms"
      ADD COLUMN IF NOT EXISTS "school_id" integer
    `);

    // 2a. Backfill from branch.school_id  (school_branches.school_id holds the School pkid)
    await queryRunner.query(`
      UPDATE "classrooms" c
      SET    "school_id" = sb."school_id"
      FROM   "school_branches" sb
      WHERE  sb."pkid" = c."branch_id"
        AND  c."school_id" IS NULL
    `);

    // 3a. FK constraint
    await queryRunner.query(`
      ALTER TABLE "classrooms"
      ADD CONSTRAINT "FK_classrooms_school_id"
        FOREIGN KEY ("school_id")
        REFERENCES "schools"("pkid")
        ON DELETE CASCADE
        ON UPDATE CASCADE
    `);

    // ── students ──────────────────────────────────────────────────────────────

    // 1b. Add nullable column
    await queryRunner.query(`
      ALTER TABLE "students"
      ADD COLUMN IF NOT EXISTS "school_id" integer
    `);

    // 2b. Backfill from branch.school_id
    await queryRunner.query(`
      UPDATE "students" s
      SET    "school_id" = sb."school_id"
      FROM   "school_branches" sb
      WHERE  sb."pkid" = s."branch_id"
        AND  s."school_id" IS NULL
    `);

    // 3b. FK constraint
    await queryRunner.query(`
      ALTER TABLE "students"
      ADD CONSTRAINT "FK_students_school_id"
        FOREIGN KEY ("school_id")
        REFERENCES "schools"("pkid")
        ON DELETE CASCADE
        ON UPDATE CASCADE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "students" DROP CONSTRAINT IF EXISTS "FK_students_school_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" DROP COLUMN IF EXISTS "school_id"`,
    );

    await queryRunner.query(
      `ALTER TABLE "classrooms" DROP CONSTRAINT IF EXISTS "FK_classrooms_school_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "classrooms" DROP COLUMN IF EXISTS "school_id"`,
    );
  }
}
