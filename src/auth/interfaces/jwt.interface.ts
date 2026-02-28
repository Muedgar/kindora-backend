/**
 * JWT token payload.
 * Carries only the user's stable identity — no role or school data.
 * School context is resolved per-request via X-School-Id header (Phase 3).
 *
 * The optional `purpose` claim narrows a token to a specific use-case:
 *   - 'invite'  → first-time password setup via POST /auth/accept-invite
 *   - undefined → standard session / password-reset token
 */
export interface JwtPayload {
  id: string;
  email: string;
  /** Restricts the token to a specific flow (e.g. 'invite'). */
  purpose?: string;
}
