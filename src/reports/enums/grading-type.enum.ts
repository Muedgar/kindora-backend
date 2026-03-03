/**
 * EGradingType — Phase 1.
 *
 * Defines the four grading strategies supported by the platform.
 * String values are used so the enum round-trips cleanly through
 * JSON and PostgreSQL VARCHAR without losing meaning.
 *
 * Normalisation rules (each maps to a 0–100 normalised score):
 *   RUBRIC    — descriptor labels (MASTERED / PRACTICING / INTRODUCED / NOT_INTRODUCED
 *               and A–F scale). Fixed mapping applied by NormalisationService.
 *   NUMERIC   — integer or decimal score within a configured [min, max] range.
 *               Uses: (value − min) / (max − min) × 100.
 *   YES_NO    — binary outcome. true → 100, false → 0.
 *   FREQUENCY — how many times an activity was observed per session.
 *               Uses: (count / maxFrequency) × 100.
 */
export enum EGradingType {
  RUBRIC = 'RUBRIC',
  NUMERIC = 'NUMERIC',
  YES_NO = 'YES_NO',
  FREQUENCY = 'FREQUENCY',
}

/**
 * Config shapes expected in Activity.gradingConfig per grading type.
 *
 * Stored as JSONB on the Activity row; validated at the DTO layer.
 */
export interface NumericGradingConfig {
  min: number;
  max: number;
}

export interface FrequencyGradingConfig {
  maxFrequency: number;
}

/** Union type for gradingConfig — null for RUBRIC and YES_NO. */
export type GradingConfig =
  | NumericGradingConfig
  | FrequencyGradingConfig
  | null;
