/**
 * JWT token payload.
 * Carries only the user's stable identity — no role or school data.
 * School context is resolved per-request via X-School-Id header (Phase 3).
 */
export interface JwtPayload {
  id: string;
  email: string;
}
