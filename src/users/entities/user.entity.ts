import { AppBaseEntity } from 'src/common/entities';
import { Column, Entity, OneToMany } from 'typeorm';
import { SchoolMember } from 'src/schools/entities/school-member.entity';

@Entity('users')
export class User extends AppBaseEntity {
  @Column({ type: 'varchar', length: 200, nullable: true })
  userName: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  firstName: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  lastName: string;

  @Column({ type: 'varchar', length: 100, nullable: false, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 250, nullable: false })
  password: string;

  @Column({ type: 'boolean', nullable: false, default: true })
  status: boolean;

  @Column({ type: 'boolean', nullable: false, default: true })
  isDefaultPassword: boolean;

  @Column({ type: 'boolean', nullable: false, default: false })
  twoFactorAuthentication: boolean;

  @Column({ type: 'boolean', nullable: false, default: false })
  emailVerified: boolean;

  @Column({ type: 'varchar', length: 250, nullable: true })
  emailVerificationKey: string;

  @Column({ type: 'timestamptz', nullable: true })
  emailVerificationExpiry: Date;

  /**
   * Incremented on password change, logout-all, or account lock.
   * Embedded in every access-token payload; a mismatch means the token
   * was issued before the revocation event and must be rejected.
   */
  @Column({ type: 'integer', nullable: false, default: 0 })
  tokenVersion: number;

  /** Consecutive failed login attempts — reset to 0 on success. */
  @Column({ type: 'integer', nullable: false, default: 0 })
  failedLoginAttempts: number;

  /** Non-null while the account is temporarily locked after too many failures. */
  @Column({ type: 'timestamptz', nullable: true })
  lockedUntil: Date | null;

  // ── Password reset (one-time nonce) ─────────────────────────────────────────
  /** SHA-256 hex of the raw reset nonce emailed to the user. */
  @Column({ type: 'varchar', length: 64, nullable: true })
  passwordResetTokenHash: string | null;

  /** When the nonce expires (1 hour after issuance). */
  @Column({ type: 'timestamptz', nullable: true })
  passwordResetTokenExpiresAt: Date | null;

  /** Set to the current timestamp when the nonce is consumed, preventing reuse. */
  @Column({ type: 'timestamptz', nullable: true })
  passwordResetTokenUsedAt: Date | null;

  @OneToMany(() => SchoolMember, (schoolMember) => schoolMember.member)
  schools: SchoolMember[];
}
