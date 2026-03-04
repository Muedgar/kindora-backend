import { AppBaseEntity } from 'src/common/entities';
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { Activity } from './activity.entity';
import { User } from 'src/users/entities';
import { Student } from 'src/students/entities/student.entity';
import { School } from 'src/schools/entities/school.entity';

/**
 * DailyReport — Phase 2 redesign.
 *
 * Records one teacher observation of one student on one activity for one
 * calendar day. The unique key (student, activity, date) enforces a single
 * observation per student per activity per day; re-submitting the same triple
 * upserts the existing record (allowing teachers to correct mistakes).
 *
 * rawValue stores the grade as entered by the teacher. Valid formats depend on
 * the referenced activity's gradingType:
 *
 *   RUBRIC    → "MASTERED" | "PRACTICING" | "INTRODUCED" | "NOT_INTRODUCED"
 *               or letter grade: "A" | "B" | "C" | "D" | "E" | "F"
 *   NUMERIC   → numeric string within [min, max] from activity.gradingConfig
 *   YES_NO    → "yes" | "no" | "true" | "false" | "1" | "0"
 *   FREQUENCY → non-negative integer string ≤ maxFrequency in activity.gradingConfig
 *
 * normalisedScore (0–100) is pre-computed by NormalisationService at write
 * time to avoid repeated computation in aggregation and timeline queries.
 */
@Entity('daily_report')
@Unique('UQ_daily_report_student_activity_date', ['student', 'activity', 'date'])
export class DailyReport extends AppBaseEntity {
  /** Calendar day this observation covers. */
  @Column({ type: 'date', nullable: false })
  date: Date;

  /** Tenant anchor — scopes all queries to one school. */
  @ManyToOne(() => School, { nullable: false })
  @JoinColumn({ name: 'school_id' })
  school: School;

  @ManyToOne(() => Student, { nullable: false })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @ManyToOne(() => Activity, { nullable: false })
  @JoinColumn({ name: 'activity_id' })
  activity: Activity;

  /**
   * Raw grade value as entered by the teacher.
   * Format is validated against activity.gradingType before persisting.
   */
  @Column({ type: 'varchar', length: 100, nullable: false })
  rawValue: string;

  /**
   * Pre-computed 0–100 normalised score.
   * Stored as DECIMAL(5,2) — TypeORM returns it as a string from Postgres,
   * so always use parseFloat() before arithmetic.
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  normalisedScore: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  comments: string;

  @Column({ type: 'uuid', nullable: true })
  mediaId: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  mediaPreviewUrl: string | null;

  /**
   * Controls whether this observation appears in the parent timeline feed.
   *
   * Defaults to true — casual daily updates flow through immediately.
   * Teachers can hide specific observations (medical notes, sensitive incidents)
   * that should be discussed in person rather than appearing in the feed.
   *
   * Note: the aggregation engine always uses ALL observations regardless of
   * this flag. Snapshots have their own DRAFT→PUBLISHED visibility workflow.
   */
  @Column({ type: 'boolean', nullable: false, default: true })
  visibleToParents: boolean;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by_id' })
  updatedBy: User;
}
