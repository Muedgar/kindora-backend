import { Injectable } from '@nestjs/common';
import {
  EGradingType,
  FrequencyGradingConfig,
  GradingConfig,
  NumericGradingConfig,
} from '../enums/grading-type.enum';

/**
 * Rubric label → normalised score (0–100) mapping.
 *
 * Supports both the milestone progression labels used for developmental
 * milestones (NOT_INTRODUCED → MASTERED) and the traditional letter-grade
 * scale (A → F), so existing activity templates remain compatible.
 */
const RUBRIC_SCORES: Record<string, number> = {
  // Developmental milestone labels (primary scale)
  MASTERED: 100,
  PRACTICING: 75,
  INTRODUCED: 50,
  NOT_INTRODUCED: 25,

  // Traditional letter grades (secondary scale)
  A: 100,
  B: 80,
  C: 60,
  D: 40,
  E: 20,
  F: 0,
};

/**
 * NormalisationService — Phase 1.
 *
 * Pure computation service (no database access).
 * Converts raw grading values from any grading type into a
 * normalised 0–100 decimal score used by AggregationService (Phase 3).
 *
 * All output values are clamped to [0, 100] to guard against
 * misconfigured gradingConfig ranges.
 */
@Injectable()
export class NormalisationService {
  /**
   * Normalise a raw grade value to the 0–100 scale.
   *
   * @param rawValue   The raw value as received in the observation payload.
   *                   Type depends on gradingType:
   *                     RUBRIC    → string label ('MASTERED', 'A', etc.)
   *                     NUMERIC   → number within [config.min, config.max]
   *                     YES_NO    → boolean
   *                     FREQUENCY → number of times observed (non-negative int)
   *
   * @param gradingType  The strategy used to interpret rawValue.
   *
   * @param config  Optional configuration required for NUMERIC and FREQUENCY.
   *                Null / undefined for RUBRIC and YES_NO.
   *
   * @returns Normalised score in the range [0, 100], rounded to 2dp.
   *          Returns 0 for unrecognised inputs rather than throwing, so that
   *          a single malformed observation does not block batch processing.
   */
  normalise(
    rawValue: string | number | boolean,
    gradingType: EGradingType,
    config: GradingConfig,
  ): number {
    let score: number;

    switch (gradingType) {
      case EGradingType.RUBRIC:
        score = this.normaliseRubric(rawValue);
        break;

      case EGradingType.NUMERIC:
        score = this.normaliseNumeric(rawValue, config as NumericGradingConfig);
        break;

      case EGradingType.YES_NO:
        score = this.normaliseYesNo(rawValue);
        break;

      case EGradingType.FREQUENCY:
        score = this.normaliseFrequency(
          rawValue,
          config as FrequencyGradingConfig,
        );
        break;

      default:
        score = 0;
    }

    return this.clamp(score);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private normaliseRubric(rawValue: string | number | boolean): number {
    const label = String(rawValue).toUpperCase().trim().replace(/\s+/g, '_');
    const mapped = RUBRIC_SCORES[label];
    return mapped !== undefined ? mapped : 0;
  }

  private normaliseNumeric(
    rawValue: string | number | boolean,
    config: NumericGradingConfig | null,
  ): number {
    if (!config) return 0;

    const value = Number(rawValue);
    const { min, max } = config;

    if (!isFinite(value) || !isFinite(min) || !isFinite(max)) return 0;
    if (max === min) return 0; // avoid division-by-zero

    return ((value - min) / (max - min)) * 100;
  }

  private normaliseYesNo(rawValue: string | number | boolean): number {
    if (typeof rawValue === 'boolean') return rawValue ? 100 : 0;
    const str = String(rawValue).toLowerCase().trim();
    if (['true', 'yes', '1'].includes(str)) return 100;
    if (['false', 'no', '0'].includes(str)) return 0;
    return 0;
  }

  private normaliseFrequency(
    rawValue: string | number | boolean,
    config: FrequencyGradingConfig | null,
  ): number {
    if (!config) return 0;

    const count = Number(rawValue);
    const { maxFrequency } = config;

    if (!isFinite(count) || !isFinite(maxFrequency) || maxFrequency <= 0)
      return 0;

    return (count / maxFrequency) * 100;
  }

  /** Clamp a value to [0, 100] and round to 2 decimal places. */
  private clamp(value: number): number {
    const bounded = Math.min(100, Math.max(0, value));
    return Math.round(bounded * 100) / 100;
  }
}
