import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase A — Security Hardening (A3: one-time password reset nonces)
 *
 * Adds three nullable columns to the `users` table that support the
 * CSPRNG-based, single-use password reset token introduced in Phase A:
 *
 *   passwordResetTokenHash      VARCHAR(64)   SHA-256 hex of the raw nonce
 *   passwordResetTokenExpiresAt TIMESTAMPTZ   When the nonce expires (1 h)
 *   passwordResetTokenUsedAt    TIMESTAMPTZ   Set on first (and only) use
 *
 * A partial index on passwordResetTokenHash lets the service look up the user
 * by hashed token in O(log n) without indexing the large set of NULL rows.
 */
export class PhaseASecurityHardening1772726400000 implements MigrationInterface {
  name = 'PhaseASecurityHardening1772726400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── One-time password reset nonce columns ─────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "passwordResetTokenHash"      VARCHAR(64),
        ADD COLUMN IF NOT EXISTS "passwordResetTokenExpiresAt" TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS "passwordResetTokenUsedAt"    TIMESTAMPTZ
    `);

    // Partial index for fast hash lookup — only indexes non-NULL rows so it
    // stays compact even when most users have no active reset token.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_reset_token_hash"
        ON "users" ("passwordResetTokenHash")
        WHERE "passwordResetTokenHash" IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_users_reset_token_hash"
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "passwordResetTokenUsedAt",
        DROP COLUMN IF EXISTS "passwordResetTokenExpiresAt",
        DROP COLUMN IF EXISTS "passwordResetTokenHash"
    `);
  }
}
