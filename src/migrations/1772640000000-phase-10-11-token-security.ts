import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Phase 10 & 11 — Token security, refresh tokens, and brute-force protection.
 *
 * Changes to the `users` table:
 *   • tokenVersion          INTEGER NOT NULL DEFAULT 0
 *       Incremented on password change / logout-all / account lock.
 *       Embedded in every JWT so revocation is checked without a blacklist.
 *
 *   • failedLoginAttempts   INTEGER NOT NULL DEFAULT 0
 *       Consecutive failed password attempts.  Reset on success.
 *
 *   • lockedUntil           TIMESTAMPTZ
 *       When non-null and in the future the account rejects login attempts.
 *
 * New table `user_sessions`:
 *   One row per active device session.  The raw refresh token is NEVER stored;
 *   only its SHA-256 hash is persisted.  On every POST /auth/refresh the old
 *   row is revoked and a new row is inserted (token rotation).
 */
export class Phase1011TokenSecurity1772640000000 implements MigrationInterface {
  name = 'Phase1011TokenSecurity1772640000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Add new columns to `users` ────────────────────────────────────────

    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "tokenVersion"        INTEGER     NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER     NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "lockedUntil"         TIMESTAMPTZ
    `);

    // ── 2. Create `user_sessions` table ──────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "user_sessions" (
        "pkid"               SERIAL        PRIMARY KEY,
        "id"                 UUID          NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
        "user_id"            INTEGER       NOT NULL
                               REFERENCES "users"("pkid") ON DELETE CASCADE,
        "refreshTokenHash"   VARCHAR(64)   NOT NULL UNIQUE,
        "ipAddress"          VARCHAR(45),
        "deviceLabel"        VARCHAR(250),
        "expiresAt"          TIMESTAMPTZ   NOT NULL,
        "lastUsedAt"         TIMESTAMPTZ,
        "revokedAt"          TIMESTAMPTZ,
        "createdAt"          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
        "updatedAt"          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
      )
    `);

    // Index: fast lookup of all active sessions for a user.
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_sessions_user_revoked"
      ON "user_sessions" ("user_id", "revokedAt")
      WHERE "revokedAt" IS NULL
    `);

    // Index: fast lookup of a session by its hash (used on every refresh).
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_user_sessions_token_hash"
      ON "user_sessions" ("refreshTokenHash")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_sessions_token_hash"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_user_sessions_user_revoked"`);

    // Drop sessions table
    await queryRunner.query(`DROP TABLE IF EXISTS "user_sessions"`);

    // Remove columns from users
    await queryRunner.query(`
      ALTER TABLE "users"
        DROP COLUMN IF EXISTS "lockedUntil",
        DROP COLUMN IF EXISTS "failedLoginAttempts",
        DROP COLUMN IF EXISTS "tokenVersion"
    `);
  }
}
