import { AppBaseEntity } from 'src/common/entities';
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { ReportSnapshot } from './report-snapshot.entity';
import { Parent } from 'src/parents/entities/parent.entity';

/**
 * SnapshotReadReceipt — pre-Phase 4.
 *
 * Records when a parent opened a published report snapshot.
 *
 * Used for:
 *   • Unread count badge in the parent mobile app.
 *   • Teacher/admin visibility into whether parents have seen reports.
 *
 * One receipt per (snapshot, parent) pair — unique constraint prevents
 * duplicates; the mark-as-read endpoint is idempotent.
 */
@Entity('snapshot_read_receipts')
@Unique('UQ_read_receipt_snapshot_parent', ['snapshot', 'parent'])
export class SnapshotReadReceipt extends AppBaseEntity {
  @ManyToOne(() => ReportSnapshot, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'snapshot_id' })
  snapshot: ReportSnapshot;

  @ManyToOne(() => Parent, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent: Parent;

  @Column({ type: 'timestamptz', nullable: false })
  readAt: Date;
}
