import { AppBaseEntity } from 'src/common/entities';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Unique,
} from 'typeorm';
import { School } from 'src/schools/entities/school.entity';
import { Student } from 'src/students/entities/student.entity';
import { User } from 'src/users/entities';
import { EReportType, ESnapshotStatus, ETrend } from '../enums/snapshot.enum';
import { SnapshotActivityItem } from './snapshot-activity-item.entity';

/**
 * ReportSnapshot — Phase 3.
 *
 * An immutable (once published) summary of a child's observations across
 * one time period. Two grain sizes are supported:
 *
 *   WEEKLY  — Monday → Sunday. Auto-generated every Monday morning for the
 *              preceding week by the ReportSchedulerService.
 *   TERMLY  — School-defined term dates. Triggered manually by admin/teacher,
 *              or optionally scheduled.
 *
 * Lifecycle:  DRAFT  →  PENDING_REVIEW  →  PUBLISHED
 *
 *   DRAFT           System generates automatically; teacher hasn't reviewed.
 *   PENDING_REVIEW  Teacher has added notes and marked it ready. (Optional
 *                   step — small schools can skip straight to PUBLISHED.)
 *   PUBLISHED       Parents/guardians can see it via the parent mobile app.
 *
 * Design notes:
 *   • A PUBLISHED snapshot is never re-generated — any correction requires
 *     creating a new snapshot for the same period (old one stays for audit).
 *   • overallScore and trend are pre-computed at generation time so the
 *     parent app never blocks on aggregation queries.
 *   • Activity-level breakdown is stored in SnapshotActivityItem rows so
 *     the envelope stays lean for list views.
 */
@Entity('report_snapshots')
@Unique('UQ_snapshot_student_type_period', [
  'student',
  'type',
  'periodStart',
  'periodEnd',
])
export class ReportSnapshot extends AppBaseEntity {
  // ── Tenant + subject ────────────────────────────────────────────────────

  @ManyToOne(() => School, { nullable: false })
  @JoinColumn({ name: 'school_id' })
  school: School;

  @ManyToOne(() => Student, { nullable: false })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  // ── Period ────────────────────────────────────────────────────────────────

  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
  })
  type: EReportType;

  /** Inclusive start date of the reporting period (ISO date). */
  @Column({ type: 'date', nullable: false })
  periodStart: Date;

  /** Inclusive end date of the reporting period (ISO date). */
  @Column({ type: 'date', nullable: false })
  periodEnd: Date;

  // ── Aggregated headline figures ─────────────────────────────────────────

  /** Total number of individual observations in this period. */
  @Column({ type: 'int', default: 0 })
  totalObservations: number;

  /**
   * Weighted average of all per-activity normalised scores (0–100).
   * NULL when no observations with normalisedScore exist for the period.
   */
  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  overallScore: number;

  /**
   * Direction of change across the period.
   * NULL when there is only one data point (can't compute a trend).
   */
  @Column({ type: 'varchar', length: 20, nullable: true })
  trend: ETrend;

  // ── Teacher review workflow ─────────────────────────────────────────────

  @Column({
    type: 'varchar',
    length: 20,
    default: ESnapshotStatus.DRAFT,
  })
  status: ESnapshotStatus;

  /** Narrative notes written by the teacher before publishing. */
  @Column({ type: 'text', nullable: true })
  teacherNotes: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewed_by_id' })
  reviewedBy: User;

  @Column({ type: 'timestamptz', nullable: true })
  reviewedAt: Date;

  /** Timestamp when status was set to PUBLISHED. */
  @Column({ type: 'timestamptz', nullable: true })
  publishedAt: Date;

  // ── Provenance ────────────────────────────────────────────────────────────

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by_id' })
  updatedBy: User;

  // ── Activity breakdown (loaded on demand) ─────────────────────────────────

  @OneToMany(
    () => SnapshotActivityItem,
    (item) => item.snapshot,
    { cascade: true },
  )
  activityItems: SnapshotActivityItem[];
}
