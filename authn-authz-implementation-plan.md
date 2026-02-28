# Authentication & Authorisation — Implementation Plan
**Project:** Kindora Backend
**Spec reference:** Module C — Authentication Requirements
**Date:** February 2026

---

## 1. Applicability Assessment

Before planning, each requirement is evaluated against Kindora's context (multi-tenant school SaaS, Rwanda v1, expanding to broader African markets).

| Req | Requirement | Applicable? | Rationale |
|-----|-------------|-------------|-----------|
| C1.1 Password login | ✅ Done | Already implemented |
| C1.1 SSO login | ✅ In plan | Schools often use Google Workspace or Microsoft 365 |
| C1.2 Configurable token lifetime | ✅ In plan | Per-tenant policy needed for compliance |
| C1.2 Token revocation (password change) | ✅ In plan | Critical security gap — currently no revocation |
| C1.2 Token revocation (account disable) | ✅ In plan | Currently inactive accounts can use existing tokens |
| C1.2 Sign out all devices | ✅ In plan | Standard user expectation |
| C2.1 Provider config (platform admin) | ✅ In plan (Phase 15) | Needed for multi-tenant SSO |
| C2.2 Account linking | ✅ In plan (Phase 15) | Needed alongside OAuth2 |
| C3.1 Enable/disable SSO per tenant | ✅ In plan (Phase 15) | School admin control |
| C3.2 Break-glass admin access | ✅ In plan (Phase 15) | Safety net if SSO fails |
| C4.1 MFA enrollment / disable | ✅ Partial | Enable/disable done; backup recovery codes missing |
| C4.1 Backup recovery codes | ✅ In plan | Missing; required for compliance |
| C4.2 MFA enforcement (by role) | ✅ In plan | Tenant can mandate MFA for admins |
| C5.1 View / terminate sessions | ✅ In plan | Requires session table (currently stateless) |
| C5.2 Configurable inactivity expiry | ✅ In plan | Tied to refresh token sliding window |
| C5.2 Re-auth for sensitive actions | ✅ In plan | Password change, MFA toggle, etc. |
| C6.1 Tenant-configurable password rules | ✅ In plan | Currently hardcoded regex |
| C6.2 Password reset flow | ✅ Partial | Flow exists; rate limiting missing |

---

## 2. Current State Summary

### Already Implemented

| Feature | Details |
|---------|---------|
| Password login | Email + bcrypt, status check |
| Access JWT | 1h expiry, HMAC-SHA256, `{id, email, purpose?}` payload |
| 2FA via OTP | 6-digit code, bcrypt-hashed, 5-min expiry, email delivery |
| Enable/disable 2FA | Per user toggle (`twoFactorAuthentication` flag on User entity) |
| Password validation | Regex: upper + lower + digit + special char |
| Password reset | JWT-based link, email delivery via queue |
| Invite flow | Purpose-bound JWT (`purpose: 'invite'`), activates SchoolMember |
| RBAC | Roles → Permissions → slugs, `PermissionGuard` enforces |
| School context | `SchoolContextGuard` — per-request tenant isolation via `X-School-Id` header |
| Branch context | `BranchContextGuard` — optional sub-tenant scoping |
| Audit logging | `AuditLogInterceptor` captures actor, school, action, payload |
| Serialiser exclusion | `ClassSerializerInterceptor` strips `password`, `pkid` from responses |

### Critical Gaps

| Gap | Risk |
|-----|------|
| No refresh tokens | Users lose session every hour; bad UX |
| No token revocation | Password change or account lock does not invalidate existing tokens |
| No rate limiting | Brute-force attacks on login, OTP, and password reset are unchecked |
| No session table | Cannot list or terminate active sessions |
| No MFA backup codes | Users locked out if they lose their email access |
| Hardcoded password policy | Cannot enforce school-specific password requirements |
| OTP randomness | `Math.random()` is not cryptographically secure |

---

## 3. Implementation Phases

### Phase 10 — Token Security & Revocation
**Priority: Critical**
**Blocks:** C1.2 (token revocation), C5.1 (session termination)

#### 10a — Refresh Token System

The current system issues a single 1-hour access token. Replace with a dual-token model:

**New entities:**

`UserSession` entity — stores one row per active device/session:
```
id          uuid (PK)
user        → User
schoolId    varchar (nullable — which school context session belongs to)
deviceLabel varchar (nullable — "Chrome on macOS", derived from User-Agent)
ipAddress   varchar
refreshToken varchar (SHA-256 hash of the raw token, never stored plaintext)
expiresAt   timestamptz (absolute expiry, default 30 days)
lastUsedAt  timestamptz (sliding window for inactivity)
revokedAt   timestamptz (nullable — set on logout/revoke)
createdAt   timestamptz
```

**Token flow:**
1. `POST /auth/login` → returns `{ accessToken, refreshToken }` + creates `UserSession` row
2. `POST /auth/refresh` → validates refresh token hash, issues new access token (and optionally rotates refresh token)
3. `POST /auth/logout` → sets `revokedAt` on the session row
4. `POST /auth/logout-all` → sets `revokedAt` on ALL sessions for the user

**Access token:** 15-minute expiry (tightened from 1h because refresh handles continuation)
**Refresh token:** 30-day absolute expiry, with sliding window reset on use

**Revocation check in `JwtStrategy.validate()`:**
- Add a `tokenVersion` integer column to `User` entity (default 0)
- Include `tokenVersion` in JWT payload at sign time
- On validate, compare `payload.tokenVersion` with `user.tokenVersion` in DB
- If mismatch → reject token (returns 401)
- Increment `user.tokenVersion` on: password change, account disable, logout-all

This is more performant than a blacklist table because it's a single integer comparison on the already-loaded user row.

**New endpoints:**
```
POST /auth/refresh          body: { refreshToken }
POST /auth/logout           body: { refreshToken }  [requires JwtAuthGuard]
POST /auth/logout-all       [requires JwtAuthGuard]
```

**New migration:** `UserSession` table, `tokenVersion` column on `users`.

#### 10b — Re-authentication Guard

For sensitive actions (changing password, enabling/disabling MFA, deleting account), require the caller to prove current password or a fresh MFA code before proceeding.

**Implementation:**
- New decorator: `@RequireReauth()` — sets metadata key `require_reauth`
- New guard: `ReauthGuard` — checks for `X-Reauth-Token` header (a short-lived purpose-bound JWT with `purpose: 'reauth'`, issued by `POST /auth/reauth` exchange)
- `POST /auth/reauth` → verifies current password → returns 5-min `purpose: 'reauth'` JWT

Apply `@RequireReauth()` to:
- `PATCH /auth/change-password`
- `PATCH /users/:id/activate-2fa`
- `PATCH /users/:id/deactivate-2fa`
- `DELETE /users/:id` (self-deletion path)

---

### Phase 11 — Rate Limiting & Brute-Force Protection
**Priority: Critical**
**Blocks:** C6.2 (rate-limited password reset)

**Install:** `@nestjs/throttler`

#### 11a — Global Throttle

Register `ThrottlerModule.forRootAsync` in `AppModule` with configurable defaults:
```
default window: 60 seconds
default limit:  100 requests per window
```

Apply `ThrottlerGuard` as a global guard in `AppModule`.

#### 11b — Per-Endpoint Throttle

Override on sensitive endpoints with tighter limits:

| Endpoint | Window | Limit | Rationale |
|----------|--------|-------|-----------|
| `POST /auth/login` | 15 min | 10 | Brute-force protection |
| `POST /auth/validate-otp` | 5 min | 5 | OTP enumeration |
| `POST /auth/forgot-password` | 60 min | 5 | Email flooding |
| `POST /auth/:token/reset-password` | 15 min | 10 | Reset link replay |
| `POST /auth/accept-invite` | 15 min | 10 | Invite token replay |
| `POST /auth/refresh` | 5 min | 20 | Token abuse |

Use `@Throttle({ default: { ttl: n, limit: n } })` decorator on each handler.

#### 11c — OTP Cryptographic Randomness Fix

Replace `Math.random()` (not CSPRNG) with Node's `crypto` module:
```typescript
import { randomInt } from 'crypto';
const otp = randomInt(100000, 999999).toString();
```

#### 11d — Account Lockout After Failed Logins

Add to `User` entity:
```
failedLoginAttempts  integer  default 0
lockedUntil          timestamptz  nullable
```

Logic in `AuthService.login()`:
- On failed password: increment `failedLoginAttempts`
- If `failedLoginAttempts >= 5`: set `lockedUntil = now + 15 minutes`
- On successful login: reset `failedLoginAttempts = 0`, clear `lockedUntil`
- At login check: if `lockedUntil && lockedUntil > now` → throw `ACCOUNT_TEMPORARILY_LOCKED` error

New migration: `failed_login_attempts`, `locked_until` columns on `users`.

---

### Phase 12 — Session Management
**Priority: High**
**Blocks:** C5.1 (view/terminate sessions), C5.2 (inactivity expiry)

Depends on: Phase 10a (UserSession entity must exist)

#### 12a — List Active Sessions Endpoint

```
GET /auth/sessions    [requires JwtAuthGuard]
```

Returns all non-revoked, non-expired `UserSession` rows for the current user:
```json
[
  {
    "id": "uuid",
    "deviceLabel": "Chrome on macOS",
    "ipAddress": "41.xxx.xxx.xxx",
    "createdAt": "2026-01-15T08:30:00Z",
    "lastUsedAt": "2026-02-01T12:00:00Z",
    "isCurrent": true
  }
]
```

Mark the current session with `isCurrent: true` by comparing the session ID embedded in the access token with each row's ID.
Add `sessionId` to the JWT payload at sign time for this.

#### 12b — Terminate Specific Session

```
DELETE /auth/sessions/:sessionId    [requires JwtAuthGuard]
```

Sets `revokedAt` on the target session row. Validates the session belongs to the requesting user.

#### 12c — Inactivity Expiry

Sliding window: refresh the `lastUsedAt` timestamp on every successful `POST /auth/refresh` call.

In `ReauthGuard` / `ThrottlerGuard`, check:
```typescript
if (session.lastUsedAt < now - tenantPolicy.sessionInactivityTimeout) {
  session.revokedAt = now;
  throw new UnauthorizedException(SESSION_EXPIRED_INACTIVITY);
}
```

Default inactivity timeout: 8 hours (overridable per tenant policy — see Phase 14).

#### 12d — Session Cleanup Job

Register a Bull cron job `session-cleanup` that runs nightly:
- Deletes `UserSession` rows where `expiresAt < now - 7 days` OR `revokedAt IS NOT NULL AND revokedAt < now - 7 days`
- Prevents unbounded table growth

---

### Phase 13 — MFA Hardening
**Priority: High**
**Blocks:** C4.1 (backup codes), C4.2 (per-role enforcement)

#### 13a — Backup Recovery Codes

When a user enables 2FA, generate 8 single-use recovery codes:
```typescript
Array.from({ length: 8 }, () => randomBytes(5).toString('hex').toUpperCase())
// e.g. "A3F8C-9B2E1"
```

**New entity:** `MfaRecoveryCode`
```
id         uuid PK
user       → User
codeHash   varchar  (bcrypt hash of the raw code)
usedAt     timestamptz nullable
createdAt  timestamptz
```

**Presentation:** Codes shown once at enrollment time (plaintext), then only hashes stored. User must download/copy.

**New endpoints:**
```
POST /auth/2fa/enable           → generates codes + enables 2FA, returns plaintext codes once
POST /auth/2fa/disable          → disables 2FA, deletes recovery codes [requires ReauthGuard]
POST /auth/2fa/recovery-codes/regenerate  → invalidates old codes, generates new 8 [requires ReauthGuard]
POST /auth/validate-recovery-code         → validates a recovery code during login (replaces OTP step)
```

**`POST /auth/validate-recovery-code` flow:**
1. Find all unused `MfaRecoveryCode` rows for the user
2. `bcrypt.compare(submittedCode, codeHash)` for each (max 8 iterations — acceptable)
3. On match: set `usedAt = now`, issue session token
4. If no match: throw `INVALID_RECOVERY_CODE`

New migration: `mfa_recovery_codes` table.

#### 13b — Per-Role MFA Enforcement

**New column on `SchoolPolicy` entity (see Phase 14) or on `Role`:**

Add `requiresMfa: boolean` to `Role` entity (default `false`).

In `SchoolContextGuard` / `BranchContextGuard`, after loading the member's roles:
```typescript
const mfaRequired = member.roles.some((smr) => smr.role.requiresMfa);
if (mfaRequired && !user.twoFactorAuthentication) {
  throw new ForbiddenException(MFA_REQUIRED_FOR_ROLE);
}
```

Migration: `requires_mfa` boolean column on `roles` table, default false.

Seed: Set `requiresMfa = true` for `school-admin` and `super-admin` roles.

---

### Phase 14 — Tenant Password & Session Policies
**Priority: Medium**
**Blocks:** C1.2 (configurable token lifetime), C6.1 (tenant password rules)

#### 14a — SchoolPolicy Entity

**New entity:** `SchoolPolicy` (one-to-one with `School`)
```
id                      uuid PK
school                  → School (unique FK)

// Password policy
passwordMinLength       integer  default 8
passwordRequireUpper    boolean  default true
passwordRequireLower    boolean  default true
passwordRequireDigit    boolean  default true
passwordRequireSpecial  boolean  default true
passwordHistoryCount    integer  default 0   (0 = disabled)
passwordMaxAgeDays      integer  default 0   (0 = no expiry)

// Session / token policy
accessTokenLifetimeMin  integer  default 15  (minutes, platform max: 60)
refreshTokenLifetimeDays integer default 30  (platform max: 90)
sessionInactivityHours  integer  default 8   (platform max: 24)

// MFA policy
mfaRequiredForAll       boolean  default false

// SSO policy (Phase 15)
ssoEnabled              boolean  default false
ssoProviderId           uuid     nullable → OidcProvider
ssoBlockPasswordLogin   boolean  default false
```

Migration: `school_policies` table.

#### 14b — Policy Enforcement

**Password validation:** Replace the hardcoded regex in all DTOs with a `PolicyPasswordValidator` custom decorator that:
1. Reads `SchoolPolicy` for the school currently being onboarded to (passed via context or resolved from an invite token)
2. Enforces the policy fields dynamically
3. Returns a policy-aware error message

**Token signing:** In `AuthService.signToken()`, load `SchoolPolicy` for the user's primary school and use `policy.accessTokenLifetimeMin` as the JWT `expiresIn`.

**Password history:** New entity `PasswordHistory` (userId, passwordHash, createdAt). On password change, check new password against last N hashes using `bcrypt.compare`. If reused, throw `PASSWORD_RECENTLY_USED`.

**Password max age:** On login, if `user.passwordChangedAt < now - policy.passwordMaxAgeDays`, throw `PASSWORD_EXPIRED` (HTTP 403) and force redirect to change-password flow.

Add `passwordChangedAt: timestamptz` to `User` entity.

#### 14c — Policy Management Endpoints

```
GET  /schools/:id/policy          [manage:school permission]
PATCH /schools/:id/policy         [manage:school permission]
```

Validation: Platform-enforced caps (e.g., `accessTokenLifetimeMin` max 60) applied in service layer regardless of what admin sends.

---

### Phase 15 — OAuth2 / OIDC / SSO
**Priority: Medium (v1.1 / enterprise tier)**
**Blocks:** C2, C3

Kindora schools commonly use Google Workspace. This phase enables school admins to configure a Google (or other OIDC-compatible) identity provider for their staff.

#### 15a — OidcProvider Entity

```
id            uuid PK
name          varchar  (e.g. "Google Workspace")
issuer        varchar  (e.g. "https://accounts.google.com")
clientId      varchar
clientSecret  varchar  (encrypted at rest — use AES-256-GCM via configService)
scopes        varchar[]
callbackUrl   varchar
discoveryUrl  varchar  (OIDC discovery endpoint)
createdBy     → User
createdAt     timestamptz
```

Migration: `oidc_providers` table.

#### 15b — School–Provider Link

`SchoolOidcProvider` join entity:
```
school        → School
provider      → OidcProvider
isEnabled     boolean  default false
autoProvision boolean  default false  (create new user if not found)
```

`SchoolPolicy.ssoProviderId` links here (see Phase 14a).

#### 15c — OIDC Authentication Flow

Use `passport-openidconnect` or `openid-client` library:

1. `GET /auth/sso/:schoolId/initiate` — redirects browser to IdP with `state` (school ID + PKCE verifier stored in Redis)
2. `GET /auth/sso/callback` — receives code, exchanges for ID token, extracts claims
3. Account resolution:
   - Look up `User` by `email` from ID token claims
   - If found and `schoolMember.status === ACTIVE` → issue session token (same as password login)
   - If not found and `autoProvision = true` → call `createUser()` with invite flow
   - If not found and `autoProvision = false` → throw `SSO_USER_NOT_PROVISIONED`
4. Cross-tenant guard: validate the school from `state` matches the school context of the resolved user

#### 15d — SSO Policy Controls

When `SchoolPolicy.ssoBlockPasswordLogin = true`:
- `AuthService.login()` checks policy and throws `PASSWORD_LOGIN_DISABLED_SSO` for non-super-admin users
- Break-glass: `User.isSuperAdmin` flag bypasses the SSO block (audited access)

New permission: `manage:sso` — required to configure SSO settings.
New migration: seed `manage:sso` permission for `school-admin` role.

---

## 4. Summary Table — Phased Rollout

| Phase | Title | Req Covered | Effort | Priority |
|-------|-------|-------------|--------|----------|
| 10a | Refresh tokens + revocation | C1.2 | High | 🔴 Critical |
| 10b | Re-authentication guard | C5.2 | Low | 🔴 Critical |
| 11 | Rate limiting + lockout | C6.2 | Medium | 🔴 Critical |
| 12 | Session management | C5.1, C5.2 | Medium | 🟠 High |
| 13a | MFA backup recovery codes | C4.1 | Medium | 🟠 High |
| 13b | Per-role MFA enforcement | C4.2 | Low | 🟠 High |
| 14 | Tenant password & session policies | C1.2, C6.1 | High | 🟡 Medium |
| 15 | OAuth2 / OIDC / SSO | C2, C3 | Very High | 🟡 Medium (v1.1) |

---

## 5. New Entities Summary

| Entity | Table | Phase |
|--------|-------|-------|
| `UserSession` | `user_sessions` | 10a |
| `MfaRecoveryCode` | `mfa_recovery_codes` | 13a |
| `PasswordHistory` | `password_history` | 14b |
| `SchoolPolicy` | `school_policies` | 14a |
| `OidcProvider` | `oidc_providers` | 15a |
| `SchoolOidcProvider` | `school_oidc_providers` | 15b |

---

## 6. User Entity Changes Summary

| Column | Type | Phase | Purpose |
|--------|------|-------|---------|
| `tokenVersion` | integer, default 0 | 10a | JWT invalidation on revoke |
| `failedLoginAttempts` | integer, default 0 | 11d | Lockout counter |
| `lockedUntil` | timestamptz, nullable | 11d | Lockout expiry |
| `passwordChangedAt` | timestamptz, nullable | 14b | Password age enforcement |

---

## 7. New Permissions to Seed

| Slug | Role(s) | Phase |
|------|---------|-------|
| `manage:sessions` | self (no school guard needed) | 12 |
| `manage:sso` | school-admin, super-admin | 15d |

---

## 8. Implementation Notes & Decisions

**Refresh token storage:** Store only a SHA-256 hash of the raw token in the DB (same principle as password hashing). The raw token is only ever sent over HTTPS and held by the client. This mitigates a DB compromise exposing active sessions.

**Token rotation:** On each `POST /auth/refresh`, optionally rotate the refresh token (issue new, revoke old). Enables detection of token theft: if an attacker uses a rotated-away token, both tokens get revoked. Start with rotation enabled.

**`tokenVersion` vs blacklist:** The `tokenVersion` approach is chosen over a blacklist table because it requires zero additional DB queries (the user row is already loaded by `JwtStrategy`). The trade-off is that it invalidates ALL tokens for a user (not per-session), which is acceptable for the events that trigger it (password change, logout-all). Per-session revocation is handled by the `UserSession` table.

**PKCE for SSO:** The OAuth2 flow must use PKCE (RFC 7636) to prevent authorisation code interception attacks. Store the verifier in Redis with a 5-minute TTL keyed on the `state` parameter.

**clientSecret encryption:** `OidcProvider.clientSecret` must never be stored in plaintext. Encrypt with AES-256-GCM using a `ENCRYPTION_KEY` env variable (separate from `SECRET_KEY`).

**Migrations:** Each phase produces one migration file. The `SchoolPolicy` migration should seed a default policy row for every existing school using `INSERT INTO school_policies SELECT id, ... FROM schools ON CONFLICT DO NOTHING`.
