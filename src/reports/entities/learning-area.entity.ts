import { AppBaseEntity } from 'src/common/entities';
import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  Unique,
} from 'typeorm';
import { Activity } from './activity.entity';
import { User } from 'src/users/entities';
import { School } from 'src/schools/entities/school.entity';

/**
 * LearningArea — Phase 1.
 *
 * Top-level organisational unit for child development tracking.
 * Examples: "Language & Literacy", "Motor Skills", "Social-Emotional".
 *
 * A LearningArea belongs to one School (multi-tenant scoping) and contains
 * many Activities. The name must be unique within a school, not globally.
 */
@Entity('learning_areas')
@Unique('UQ_learning_area_school_name', ['school', 'name'])
export class LearningArea extends AppBaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string;

  /** Tenant anchor — every learning area is scoped to one school. */
  @ManyToOne(() => School, { nullable: false })
  @JoinColumn({ name: 'school_id' })
  school: School;

  /** User who created this learning area. */
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  /**
   * Activities that belong to this learning area.
   * An activity may appear in multiple learning areas across schools.
   */
  @ManyToMany(() => Activity, (activity) => activity.learningAreas)
  @JoinTable({
    name: 'learning_area_activities',
    joinColumn: { name: 'learning_area_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'activity_id', referencedColumnName: 'id' },
  })
  activities: Activity[];
}
