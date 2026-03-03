import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 4 — parent-read performance indexes.
 *
 * Adds covering indexes for:
 *  - Parent timeline reads (student + visibility + date-desc + pkid-desc)
 *  - Parent report inbox reads (school + status + student + periodEnd/published)
 */
export class Phase4ParentReadIndexes1773162000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_daily_report_parent_timeline"
        ON "daily_report" ("student_id", "visibleToParents", "date" DESC, "pkid" DESC)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_report_snapshots_parent_inbox"
        ON "report_snapshots" ("school_id", "status", "student_id", "periodEnd" DESC, "publishedAt" DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_report_snapshots_parent_inbox"
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_daily_report_parent_timeline"
    `);
  }
}
