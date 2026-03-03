import { AppBaseEntity } from 'src/common/entities';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { ReportSnapshot } from './report-snapshot.entity';
import { Activity } from './activity.entity';
import { LearningArea } from './learning-area.entity';
import { ETrend } from '../enums/snapshot.enum';

/**
 * SnapshotActivityItem — Phase 3.
 *
 * One row per activity within a ReportSnapshot, storing pre-computed
 * aggregation statistics so the parent app reads in O(1) per snapshot.
 *
 * Trend is computed per-activity (independent of the student's overall
 * trend) using the first-half / second-half comparison in AggregationService.
 *
 * learningArea is the primary learning area of the activity at snapshot
 * generation time, denormalised here so that the breakdown survives
 * curriculum reorganisation without losing historical meaning.
 * It is nullable — an activity may not belong to any learning area yet.
 */
@Entity('snapshot_activity_items')
export class SnapshotActivityItem extends AppBaseEntity {
  @ManyToOne(() => ReportSnapshot, (s) => s.activityItems, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'snapshot_id' })
  snapshot: ReportSnapshot;

  @ManyToOne(() => Activity, { nullable: false })
  @JoinColumn({ name: 'activity_id' })
  activity: Activity;

  /**
   * Primary learning area for this activity at the time the snapshot was
   * generated. Stored as a FK so list queries can GROUP BY learning area
   * without a separate join through learning_area_activities.
   */
  @ManyToOne(() => LearningArea, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'learning_area_id' })
  learningArea: LearningArea;

  /**
   * Denormalised learning-area name — survives even if the LearningArea row
   * is later deleted or renamed.
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  learningAreaName: string;

  /** Number of observations recorded for this activity in the period. */
  @Column({ type: 'int', default: 0 })
  observationCount: number;

  /**
   * Mean normalised score across all observations in the period (0–100).
   * NULL when normalisedScore was not computable for all raw values.
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  averageScore: number;

  /**
   * Normalised score of the first (earliest) observation — used with
   * lastScore to compute a simplified trend.
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  firstScore: number;

  /**
   * Normalised score of the most recent observation.
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  lastScore: number;

  /**
   * Direction of change for this specific activity.
   * NULL when observationCount < 2.
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  trend: ETrend;

  /**
   * The raw value string of the most recent observation (e.g. "MASTERED",
   * "8", "yes"). Shown alongside the score for context in the parent UI.
   */
  @Column({ type: 'varchar', length: 100, nullable: true })
  latestRawValue: string;
}
