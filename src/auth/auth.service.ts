import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/users/users.service';
import { ConfigService } from '@nestjs/config';
import {
  DEACTIVATED_USER,
  INVALID_OTP,
  INVALID_TOKEN,
  INVITE_TOKEN_EXPIRED,
  INVITE_TOKEN_INVALID,
  OTP_EXPIRED,
  INVALID_REFRESH_TOKEN,
  ACCOUNT_TEMPORARILY_LOCKED,
  PASSWORD_RESET_TOKEN_INVALID,
  PASSWORD_RESET_TOKEN_USED,
  PASSWORD_RESET_TOKEN_EXPIRED,
  SESSION_NOT_FOUND,
} from './messages';
import { SchoolMember } from 'src/schools/entities/school-member.entity';
import { School } from 'src/schools/entities/school.entity';
import { ESchoolMemberStatus } from 'src/schools/enums';
import * as bcrypt from 'bcryptjs';
import { randomBytes, randomInt, createHash } from 'crypto';
import {
  ChangePasswordDto,
  RegisterDeviceTokenDto,
  LoginDto,
  OtpDTO,
  RemoveDeviceTokenDto,
  RequestResetPasswordDto,
  ResetPasswordDto,
  LogoutDto,
  ReauthDto,
} from './dto';
import { UserSerializer } from 'src/users/serializers';
import {
  INVALID_CREDENTIALS,
  INVALID_CURRENT_PASSWORD,
  USER_NOT_FOUND,
} from 'src/users/messages';
import { JwtPayload } from './interfaces';
import { RequestUser } from './types';
import { Mail } from 'src/common/interfaces';
import { EmailService } from 'src/common/services';
import { AuditLogService } from 'src/common/services';
import {
  OTP_VERIFICATION_EMAIL_JOB,
  PASSWORD_RESET_EMAIL_JOB,
  RESET_PASSWORD_EMAIL_JOB,
  ACCOUNT_LOCKED_EMAIL_JOB,
} from 'src/common/constants';
import { UserSession } from './entities/user-session.entity';
import { NotificationFacadeService } from 'src/communication/services/notification-facade.service';

// ── Module-level constants ────────────────────────────────────────────────────

/** How long (ms) the raw refresh token is valid. */
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/** How long (ms) a password-reset nonce is valid. */
const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/** Max consecutive failed logins before temporary lock. */
const MAX_FAILED_ATTEMPTS = 5;

/** Lock duration (ms) after exceeding max failures. */
const LOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * B3 — Sliding inactivity window.
 *
 * If a session's lastUsedAt (or createdAt for brand-new sessions) is older
 * than this many days, the refresh token is rejected and the session revoked.
 * This prevents a forgotten device from remaining authenticated indefinitely.
 */
const INACTIVITY_DAYS = 7;

/**
 * A2 — Pre-computed dummy hash used for constant-time rejection.
 *
 * When a login email is not found we still run bcrypt.compareSync() against
 * this hash so the response time is indistinguishable from a real wrong-
 * password attempt.  Computed once at module load (≈300 ms); not a real user.
 */
const DUMMY_HASH = bcrypt.hashSync('__kindora_timing_dummy__', 12);

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(SchoolMember)
    private schoolMemberRepository: Repository<SchoolMember>,
    @InjectRepository(UserSession)
    private sessionRepository: Repository<UserSession>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private userService: UserService,
    private emailService: EmailService,
    private auditLogService: AuditLogService,
    private notificationFacadeService: NotificationFacadeService,
  ) {}

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private async decodeToken(token: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync(token);
    } catch {
      throw new BadRequestException(INVALID_TOKEN);
    }
  }

  private convertOtpToArray(otp: string): number[] {
    return otp.split('').map(Number);
  }

  /** Cryptographically-secure 6-digit OTP. */
  private generateOTP(): string {
    return randomInt(100000, 1000000).toString();
  }

  /** A5 — cost factor 12 (up from 10). */
  private hashOTP(otp: string): string {
    return bcrypt.hashSync(otp, bcrypt.genSaltSync(12));
  }

  /** SHA-256 hex — used for refresh tokens and password-reset nonces. */
  private sha256Hex(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Signs a 15-minute access JWT embedding tokenVersion + sessionId so the
   * JwtStrategy can detect revocation without an extra DB round-trip.
   */
  private signAccessToken(user: User, sessionId?: string): string {
    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      tokenVersion: user.tokenVersion,
      sessionId,
    };
    return this.jwtService.sign(payload, { expiresIn: '15m' });
  }

  /**
   * Creates a UserSession row and returns the raw (unhashed) refresh token.
   * The raw token is given to the caller once and never persisted.
   *
   * @param lastUsedAt  Pass `new Date()` during token rotation so the sliding
   *                    inactivity window is anchored to the refresh, not the
   *                    initial session creation.  Pass `null` for a brand-new
   *                    login session (first refresh will update it).
   */
  private async createSession(
    user: User,
    ipAddress: string | null,
    deviceLabel: string | null,
    lastUsedAt: Date | null = null,
  ): Promise<string> {
    const rawToken = randomBytes(40).toString('hex');
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    const session = this.sessionRepository.create({
      user,
      refreshTokenHash: this.sha256Hex(rawToken),
      ipAddress,
      deviceLabel,
      expiresAt,
      lastUsedAt,
      revokedAt: null,
    });

    await this.sessionRepository.save(session);
    return rawToken;
  }

  /** Issues a full token pair (accessToken + refreshToken). */
  async issueTokenPair(
    user: User,
    ipAddress: string | null,
    deviceLabel: string | null,
    lastUsedAt: Date | null = null,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const rawRefresh = await this.createSession(user, ipAddress, deviceLabel, lastUsedAt);
    const session = await this.sessionRepository.findOne({
      where: { refreshTokenHash: this.sha256Hex(rawRefresh) },
    });

    const accessToken = this.signAccessToken(user, session?.id);
    return { accessToken, refreshToken: rawRefresh };
  }

  /** Bulk-revokes all active sessions (password change, logout-all, lock). */
  private async revokeAllSessions(userPkid: number): Promise<void> {
    await this.sessionRepository
      .createQueryBuilder()
      .update(UserSession)
      .set({ revokedAt: new Date() })
      .where('user_id = :userPkid', { userPkid })
      .andWhere('"revokedAt" IS NULL')
      .execute();
  }

  /**
   * Resolve the user's primary active school for client-side X-School-Id.
   * Priority: explicit default, then most recently selected, then oldest
   * active membership as a stable fallback.
   */
  private async resolvePrimarySchoolId(userId: string): Promise<string | null> {
    const member = await this.schoolMemberRepository.findOne({
      where: {
        member: { id: userId },
        status: ESchoolMemberStatus.ACTIVE,
      },
      relations: ['school'],
      order: {
        isDefault: 'DESC',
        lastSelectedAt: 'DESC',
        createdAt: 'ASC',
      },
    });

    return member?.school?.id ?? null;
  }

  // ---------------------------------------------------------------------------
  // Auth flows
  // ---------------------------------------------------------------------------

  async login(
    loginDTO: LoginDto,
    ipAddress: string | null,
    deviceLabel: string | null,
  ): Promise<{
    accessToken?: string;
    refreshToken?: string;
    user?: UserSerializer | { email: string };
    requiresOtp?: boolean;
    schoolId?: string | null;
  }> {
    const { email, password } = loginDTO;
    const user = await this.userRepository.findOne({ where: { email } });

    // A2 — Constant-time rejection: always run bcrypt even when the user is
    // not found so response time cannot be used to enumerate valid emails.
    if (!user) {
      bcrypt.compareSync(password, DUMMY_HASH);
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(ACCOUNT_TEMPORARILY_LOCKED);
    }

    const passwordValid = bcrypt.compareSync(password, user.password);

    if (!passwordValid) {
      user.failedLoginAttempts = (user.failedLoginAttempts ?? 0) + 1;
      const willLock = user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS;

      if (willLock) {
        user.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
        user.tokenVersion = (user.tokenVersion ?? 0) + 1;
        await this.revokeAllSessions(user.pkid);
      }

      await this.userRepository.save(user);

      // B1 — Audit every failed credential attempt.
      void this.auditLogService.log({
        actorId: user.id,
        action: 'login:failed',
        resource: 'user',
        resourceId: user.id,
        ipAddress,
        payload: { failedAttempts: user.failedLoginAttempts },
      });

      if (willLock) {
        // B1 — Audit the account lock event separately for SIEM / alerting.
        void this.auditLogService.log({
          actorId: user.id,
          action: 'account:locked',
          resource: 'user',
          resourceId: user.id,
          ipAddress,
          payload: { lockedUntil: user.lockedUntil },
        });

        // B4 — Notify the account owner so they know the lock was triggered.
        const lockEmail: Mail = {
          to: user.email,
          data: { firstName: user.firstName },
        };
        void this.emailService.sendEmail(lockEmail, ACCOUNT_LOCKED_EMAIL_JOB);
      }

      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (!user.status) {
      throw new UnauthorizedException(DEACTIVATED_USER);
    }

    user.failedLoginAttempts = 0;
    user.lockedUntil = null;
    await this.userRepository.save(user);

    if (user.twoFactorAuthentication) {
      const otp = this.generateOTP();
      const otpExpiry = new Date();
      otpExpiry.setMinutes(otpExpiry.getMinutes() + 5);

      user.emailVerificationKey = this.hashOTP(otp);
      user.emailVerificationExpiry = otpExpiry;
      await this.userRepository.save(user);

      const emailData: Mail = {
        to: user.email,
        data: {
          firstName: user.userName,
          otp: this.convertOtpToArray(otp),
        },
      };

      await this.emailService.sendEmail(emailData, OTP_VERIFICATION_EMAIL_JOB);
      return { requiresOtp: true, user: { email: user.email } };
    }

    const { accessToken, refreshToken } = await this.issueTokenPair(
      user,
      ipAddress,
      deviceLabel,
    );
    const schoolId = await this.resolvePrimarySchoolId(user.id);

    return {
      accessToken,
      refreshToken,
      user: new UserSerializer(user),
      schoolId,
    };
  }

  async validateOTP(
    otpDto: OtpDTO,
    ipAddress: string | null,
    deviceLabel: string | null,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: UserSerializer;
    schoolId: string | null;
  }> {
    const { email, otp } = otpDto;
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    if (!bcrypt.compareSync(otp, user.emailVerificationKey)) {
      throw new UnauthorizedException(INVALID_OTP);
    }

    if (new Date() > user.emailVerificationExpiry) {
      throw new UnauthorizedException(OTP_EXPIRED);
    }

    user.emailVerificationKey = '';
    user.emailVerificationExpiry = new Date();
    user.emailVerified = true;
    await this.userRepository.save(user);

    const { accessToken, refreshToken } = await this.issueTokenPair(
      user,
      ipAddress,
      deviceLabel,
    );
    const schoolId = await this.resolvePrimarySchoolId(user.id);

    return { accessToken, refreshToken, user: new UserSerializer(user), schoolId };
  }

  /**
   * A3 — Issues a one-time password-reset nonce.
   *
   * Generates a CSPRNG 32-byte hex nonce, stores only its SHA-256 hash on the
   * user row (+1-hour expiry), and emails the raw nonce.  On redemption the
   * nonce is marked used — a second attempt with the same link is rejected even
   * within the expiry window.
   */
  async requestPasswordReset(
    requestResetPasswordDTO: RequestResetPasswordDto,
  ): Promise<void> {
    // Use the repository directly (not getUserByEmail which returns UserSerializer)
    // so we work with the raw User entity and can persist the new nonce columns.
    // Product requirement: return an error when the email does not exist.
    const user = await this.userRepository.findOne({
      where: { email: requestResetPasswordDTO.email },
    });

    if (!user) {
      throw new NotFoundException(USER_NOT_FOUND);
    }

    const rawToken = randomBytes(32).toString('hex'); // 64-char hex nonce
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

    user.passwordResetTokenHash = this.sha256Hex(rawToken);
    user.passwordResetTokenExpiresAt = expiresAt;
    user.passwordResetTokenUsedAt = null;
    await this.userRepository.save(user);

    const emailData: Mail = {
      to: user.email,
      // `token` is the raw nonce — the email template embeds it in the reset URL.
      data: { firstName: user.firstName, token: rawToken },
    };

    await this.emailService.sendEmailStrict(
      emailData,
      RESET_PASSWORD_EMAIL_JOB,
    );
  }

  /**
   * A3 — Validates the one-time nonce and sets the new password.
   *
   * The raw nonce is the `:token` URL param (same controller surface as before).
   * It is hashed and matched — no JWT decoding required.
   */
  async resetPassword(
    rawToken: string,
    resetPasswordDTO: ResetPasswordDto,
  ): Promise<void> {
    const hash = this.sha256Hex(rawToken);
    const user = await this.userRepository.findOne({
      where: { passwordResetTokenHash: hash },
    });

    if (!user) {
      throw new BadRequestException(PASSWORD_RESET_TOKEN_INVALID);
    }

    if (user.passwordResetTokenUsedAt) {
      throw new BadRequestException(PASSWORD_RESET_TOKEN_USED);
    }

    if (
      !user.passwordResetTokenExpiresAt ||
      user.passwordResetTokenExpiresAt < new Date()
    ) {
      throw new BadRequestException(PASSWORD_RESET_TOKEN_EXPIRED);
    }

    // A5 — cost factor 12.
    user.password = bcrypt.hashSync(
      resetPasswordDTO.password,
      bcrypt.genSaltSync(12),
    );
    user.isDefaultPassword = false;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    // Consume the nonce — any further attempt with this link will be rejected.
    user.passwordResetTokenUsedAt = new Date();
    await this.userRepository.save(user);
    await this.revokeAllSessions(user.pkid);

    const emailData: Mail = {
      to: user.email,
      data: { firstName: user.firstName },
    };

    await this.emailService.sendEmail(emailData, PASSWORD_RESET_EMAIL_JOB);
  }

  async changePassword(
    changePasswordDTO: ChangePasswordDto,
    reqUser: RequestUser,
  ): Promise<void> {
    const user = await this.userService.getUser(reqUser.id);

    if (!bcrypt.compareSync(changePasswordDTO.currentPassword, user.password)) {
      throw new BadRequestException(INVALID_CURRENT_PASSWORD);
    }

    // A5 — cost factor 12.
    user.password = bcrypt.hashSync(
      changePasswordDTO.newPassword,
      bcrypt.genSaltSync(12),
    );
    user.isDefaultPassword = false;
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    await this.userRepository.save(user);
    await this.revokeAllSessions(user.pkid);
  }

  /**
   * Accepts a school invitation, sets the chosen password, marks the account
   * verified, and activates the school membership.
   */
  async acceptInvite(
    token: string,
    password: string,
    ipAddress: string | null,
    deviceLabel: string | null,
  ): Promise<{ accessToken: string; refreshToken: string; user: UserSerializer }> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new BadRequestException(INVITE_TOKEN_EXPIRED);
    }

    if (payload.purpose !== 'invite') {
      throw new BadRequestException(INVITE_TOKEN_INVALID);
    }

    const user = await this.userService.getUser(payload.id);

    // A5 — cost factor 12.
    user.password = bcrypt.hashSync(password, bcrypt.genSaltSync(12));
    user.isDefaultPassword = false;
    user.emailVerified = true;
    await this.userRepository.save(user);

    const membership = await this.schoolMemberRepository.findOne({
      where: {
        member: { id: user.id },
        status: ESchoolMemberStatus.INVITED,
      },
    });

    if (membership) {
      membership.status = ESchoolMemberStatus.ACTIVE;
      membership.acceptedAt = new Date();
      await this.schoolMemberRepository.save(membership);
    }

    const { accessToken, refreshToken } = await this.issueTokenPair(
      user,
      ipAddress,
      deviceLabel,
    );
    return { accessToken, refreshToken, user: new UserSerializer(user) };
  }

  // ---------------------------------------------------------------------------
  // Refresh token rotation
  // ---------------------------------------------------------------------------

  async refreshToken(
    rawToken: string,
    ipAddress: string | null,
    deviceLabel: string | null,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const hash = this.sha256Hex(rawToken);
    const session = await this.sessionRepository.findOne({
      where: { refreshTokenHash: hash },
      relations: ['user'],
    });

    if (!session) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }

    if (session.revokedAt) {
      // Reuse of a revoked token is a potential token-theft signal —
      // revoke all sessions for this user immediately.
      await this.revokeAllSessions(session.user.pkid);
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }

    // B3 — Sliding inactivity window.
    // If no refresh has been made yet, anchor to createdAt; otherwise use
    // the timestamp of the last successful rotation (lastUsedAt).
    const inactivityCutoff = new Date(
      Date.now() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000,
    );
    const lastActivity = session.lastUsedAt ?? session.createdAt;
    if (lastActivity < inactivityCutoff) {
      session.revokedAt = new Date();
      await this.sessionRepository.save(session);
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }

    // Rotate: mark old session as consumed, mint a new one.
    session.revokedAt = new Date();
    await this.sessionRepository.save(session);

    const user = await this.userRepository.findOne({
      where: { pkid: session.user.pkid },
    });

    if (!user || !user.status) {
      throw new UnauthorizedException(INVALID_REFRESH_TOKEN);
    }

    // Pass lastUsedAt = now so the sliding window resets on every rotation.
    return this.issueTokenPair(user, ipAddress, deviceLabel, new Date());
  }

  // ---------------------------------------------------------------------------
  // Session management (B2)
  // ---------------------------------------------------------------------------

  /**
   * B2 — Returns the requesting user's active sessions, newest first.
   *
   * Excludes revoked and expired sessions so the client only sees sessions
   * the user could still use.  Omits `refreshTokenHash` — clients never
   * need the stored hash.
   */
  async getSessions(userId: string): Promise<
    Array<{
      id: string;
      deviceLabel: string | null;
      ipAddress: string | null;
      lastUsedAt: Date | null;
      createdAt: Date;
      expiresAt: Date;
    }>
  > {
    const sessions = await this.sessionRepository
      .createQueryBuilder('s')
      .innerJoin('s.user', 'u')
      .where('u.id = :userId', { userId })
      .andWhere('s."revokedAt" IS NULL')
      .andWhere('s."expiresAt" > NOW()')
      .orderBy('s."createdAt"', 'DESC')
      .getMany();

    return sessions.map((s) => ({
      id: s.id,
      deviceLabel: s.deviceLabel,
      ipAddress: s.ipAddress,
      lastUsedAt: s.lastUsedAt,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    }));
  }

  /**
   * B2 — Revokes a specific session by UUID.
   *
   * The session must belong to the requesting user — prevents one user from
   * revoking another user's sessions.
   */
  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.sessionRepository
      .createQueryBuilder('s')
      .innerJoin('s.user', 'u')
      .where('u.id = :userId', { userId })
      .andWhere('s.id = :sessionId', { sessionId })
      .andWhere('s."revokedAt" IS NULL')
      .getOne();

    if (!session) {
      throw new NotFoundException(SESSION_NOT_FOUND);
    }

    session.revokedAt = new Date();
    await this.sessionRepository.save(session);
  }

  // ---------------------------------------------------------------------------
  // Logout
  // ---------------------------------------------------------------------------

  async logout(dto: LogoutDto): Promise<void> {
    const hash = this.sha256Hex(dto.refreshToken);
    const session = await this.sessionRepository.findOne({
      where: { refreshTokenHash: hash },
    });

    if (session && !session.revokedAt) {
      session.revokedAt = new Date();
      await this.sessionRepository.save(session);
    }
  }

  async logoutAll(reqUser: RequestUser): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: reqUser.id },
    });

    if (user) {
      user.tokenVersion = (user.tokenVersion ?? 0) + 1;
      await this.userRepository.save(user);
      await this.revokeAllSessions(user.pkid);
    }
  }

  async registerDeviceToken(
    reqUser: RequestUser,
    school: School,
    dto: RegisterDeviceTokenDto,
  ): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { id: reqUser.id },
    });
    if (!user) throw new UnauthorizedException(INVALID_CREDENTIALS);

    await this.notificationFacadeService.registerDeviceToken({
      user,
      school,
      token: dto.token,
      platform: dto.platform,
      provider: dto.provider,
    });
  }

  async removeDeviceToken(
    reqUser: RequestUser,
    school: School,
    dto: RemoveDeviceTokenDto,
  ): Promise<{ removed: number }> {
    const user = await this.userRepository.findOne({
      where: { id: reqUser.id },
    });
    if (!user) throw new UnauthorizedException(INVALID_CREDENTIALS);

    return this.notificationFacadeService.deregisterDeviceToken({
      user,
      school,
      token: dto.token,
    });
  }

  // ---------------------------------------------------------------------------
  // Re-authentication gate
  // ---------------------------------------------------------------------------

  async reauth(
    reqUser: RequestUser,
    dto: ReauthDto,
  ): Promise<{ reauthToken: string }> {
    const user = await this.userRepository.findOne({
      where: { id: reqUser.id },
    });

    if (!user || !bcrypt.compareSync(dto.currentPassword, user.password)) {
      throw new UnauthorizedException(INVALID_CREDENTIALS);
    }

    const payload: JwtPayload = {
      id: user.id,
      email: user.email,
      purpose: 'reauth',
    };

    const reauthToken = this.jwtService.sign(payload, {
      expiresIn: '5m',
      secret: this.configService.get('SECRET_KEY'),
    });

    return { reauthToken };
  }
}
