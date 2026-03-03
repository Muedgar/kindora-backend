/**
 * Phase 3 enums for the report snapshot / generation engine.
 *
 * EReportType   — the temporal grain of a generated report.
 * ESnapshotStatus — lifecycle of a report before it reaches parents.
 * ETrend        — direction of a child's normalised score over the period.
 */

export enum EReportType {
  WEEKLY = 'WEEKLY',
  TERMLY = 'TERMLY',
}

export enum ESnapshotStatus {
  /** Auto-generated; not yet seen by a teacher. */
  DRAFT = 'DRAFT',
  /** Teacher has added notes and flagged it ready to share. */
  PENDING_REVIEW = 'PENDING_REVIEW',
  /** Published — visible to parents/guardians. */
  PUBLISHED = 'PUBLISHED',
  /** Sent/archived delivery state for parent inbox compatibility. */
  SENT = 'SENT',
}

export enum ETrend {
  IMPROVING = 'IMPROVING',
  DECLINING = 'DECLINING',
  STABLE = 'STABLE',
}

/**
 * Human-readable performance band shown to parents.
 * Mapped from overallScore (0–100 normalised scale).
 */
export enum EPerformanceBand {
  EXCELLENT = 'EXCELLENT', // ≥ 80
  GOOD = 'GOOD', // ≥ 60
  DEVELOPING = 'DEVELOPING', // ≥ 40
  NEEDS_SUPPORT = 'NEEDS_SUPPORT', // < 40
}

export function scoreToBand(score: number | null): EPerformanceBand | null {
  if (score === null || score === undefined) return null;
  if (score >= 80) return EPerformanceBand.EXCELLENT;
  if (score >= 60) return EPerformanceBand.GOOD;
  if (score >= 40) return EPerformanceBand.DEVELOPING;
  return EPerformanceBand.NEEDS_SUPPORT;
}
