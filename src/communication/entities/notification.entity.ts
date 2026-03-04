import { AppBaseEntity } from 'src/common/entities';
import { School } from 'src/schools/entities/school.entity';
import { User } from 'src/users/entities';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

export type NotificationType =
  | 'NEW_REPORT'
  | 'GOAL_MILESTONE'
  | 'SCHOOL_ANNOUNCEMENT';

@Entity('notifications')
export class Notification extends AppBaseEntity {
  @ManyToOne(() => School, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'school_id' })
  school: School | null;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 30, nullable: false })
  type: NotificationType;

  @Column({ type: 'varchar', length: 200, nullable: false })
  title: string;

  @Column({ type: 'text', nullable: false })
  body: string;

  @Column({ type: 'varchar', length: 36, nullable: true })
  relatedEntityId: string | null;

  @Column({ type: 'boolean', nullable: false, default: false })
  isRead: boolean;
}
