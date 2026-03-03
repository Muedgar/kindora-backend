import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Pre-Phase 4 migration — Parent App Access prerequisites
 *
 * Changes:
 *   1. daily_report     — add "visibleToParents" BOOLEAN column (default true)
 *   2. snapshot_read_receipts — new table: one receipt per (snapshot, parent)
 *
 * No permission changes needed; existing read:report-snapshot already covers
 * the mark-as-read and unread-count endpoints.
 */
export class PrePhase4ParentAccess1773072000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. daily_report.visibleToParents ─────────────────────────────────────
    //
    // Default TRUE so all existing observations remain visible — zero downtime.
    // Teachers can set FALSE on individual observations (medical notes, sensitive
    // incidents) that should be discussed in person rather than appearing in
    // the parent timeline feed.
    await queryRunner.query(`
      ALTER TABLE "daily_report"
        ADD COLUMN IF NOT EXISTS "visibleToParents" BOOLEAN NOT NULL DEFAULT true
    `);

    // ── 2. snapshot_read_receipts ─────────────────────────────────────────────
    //
    // Records when a parent opened a published report snapshot.
    // One receipt per (snapshot, parent) pair — idempotent mark-as-read.
    // Cascades on both sides so orphaned receipts are never left behind.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "snapshot_read_receipts" (
        "pkid"          SERIAL        NOT NULL,
        "id"            UUID          NOT NULL DEFAULT uuid_generate_v4(),
        "version"       INTEGER       NOT NULL DEFAULT 1,
        "createdAt"     TIMESTAMPTZ   NOT NULL DEFAULT now(),
        "updatedAt"     TIMESTAMPTZ   NOT NULL DEFAULT now(),

        "snapshot_id"   INTEGER       NOT NULL,
        "parent_id"     INTEGER       NOT NULL,
        "readAt"        TIMESTAMPTZ   NOT NULL,

        CONSTRAINT "PK_snapshot_read_receipts"   PRIMARY KEY ("pkid"),
        CONSTRAINT "UQ_snapshot_read_receipts_id" UNIQUE ("id"),

        -- Prevent duplicate receipts for the same (snapshot, parent) pair.
        -- The service uses INSERT … ON CONFLICT DO NOTHING for idempotency.
        CONSTRAINT "UQ_read_receipt_snapshot_parent"
          UNIQUE ("snapshot_id", "parent_id"),

        CONSTRAINT "FK_read_receipt_snapshot"
          FOREIGN KEY ("snapshot_id")
          REFERENCES "report_snapshots"("pkid") ON DELETE CASCADE,

        CONSTRAINT "FK_read_receipt_parent"
          FOREIGN KEY ("parent_id")
          REFERENCES "parents"("pkid") ON DELETE CASCADE
      )
    `);

    // Index: quickly count unread snapshots for a parent (home screen badge)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_read_receipt_parent_id"
        ON "snapshot_read_receipts" ("parent_id")
    `);

    // Index: check whether a specific snapshot has been read by a parent
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_read_receipt_snapshot_id"
        ON "snapshot_read_receipts" ("snapshot_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes before the table
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_read_receipt_snapshot_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_read_receipt_parent_id"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "snapshot_read_receipts"`);

    await queryRunner.query(`
      ALTER TABLE "daily_report"
        DROP COLUMN IF EXISTS "visibleToParents"
    `);
  }
}
