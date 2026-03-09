import { AppBaseEntity } from 'src/common/entities';
import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
} from 'typeorm';
import { ActivitiesTemplate } from './activity-template.entity';
import { User } from 'src/users/entities';
import { GradingLevel } from './grading-level.entity';
import { Category } from './category.entity';
import { LearningArea } from './learning-area.entity';
import { School } from 'src/schools/entities/school.entity';
import { EGradingType, GradingConfig } from '../enums/grading-type.enum';

/**
 * Activity — Phase 1 update.
 *
 * An Activity is a specific observable behaviour or skill assessed by teachers
 * (e.g. "Letter Recognition", "Ball Kicking", "Sharing with Peers").
 *
 * Phase 1 additions:
 *   - school FK for multi-tenant scoping
 *   - gradingType: the measurement strategy for this activity
 *   - gradingConfig: type-specific configuration stored as JSONB
 *     (e.g. { min: 0, max: 10 } for NUMERIC; { maxFrequency: 5 } for FREQUENCY)
 *   - learningAreas: inverse side of the LearningArea → Activity relationship
 *
 * The name column is no longer globally unique; uniqueness is enforced
 * per school via a composite index added in the Phase 1 migration.
 */
@Entity('activities')
export class Activity extends AppBaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string;

  /** Tenant anchor — every activity is scoped to one school. */
  @ManyToOne(() => School, { nullable: false })
  @JoinColumn({ name: 'school_id' })
  school: School;

  /**
   * How this activity is graded.
   * Stored as VARCHAR to avoid painful PostgreSQL enum type migrations.
   * Validated at the DTO layer with @IsEnum(EGradingType).
   */
  @Column({
    name: 'grading_type',
    type: 'varchar',
    length: 20,
    nullable: true,
    default: EGradingType.RUBRIC,
  })
  gradingType: EGradingType;

  /**
   * Type-specific grading configuration.
   *   NUMERIC   → { min: number, max: number }
   *   FREQUENCY → { maxFrequency: number }
   *   RUBRIC / YES_NO → null (no additional config needed)
   */
  @Column({ name: 'grading_config', type: 'jsonb', nullable: true })
  gradingConfig: GradingConfig;

  // ── Relations ──────────────────────────────────────────────────────────────

  /** Learning areas this activity belongs to (inverse side). */
  @ManyToMany(() => LearningArea, (area) => area.activities)
  learningAreas: LearningArea[];

  /** Templates this activity appears in (inverse side). */
  @ManyToMany(() => ActivitiesTemplate, (template) => template.activities)
  templates: ActivitiesTemplate[];

  /** @deprecated — replaced by LearningArea. Kept for backward compatibility. */
  @ManyToMany(() => Category, (category) => category.activities)
  categories: Category[];

  /** User who created this activity. Column name matches the original migration. */
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'createdByPkid' })
  createdBy: User;

  /** Grading level descriptors available for this activity. */
  @ManyToMany(() => GradingLevel, (gradingLevel) => gradingLevel.activities)
  @JoinTable({
    name: 'activity_grading_levels',
    joinColumn: { name: 'activity_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'grading_level_id', referencedColumnName: 'id' },
  })
  gradingLevels: GradingLevel[];
}
