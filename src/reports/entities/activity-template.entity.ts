import { AppBaseEntity } from 'src/common/entities';
import { Column, Entity, JoinTable, ManyToMany, ManyToOne } from 'typeorm';
import { Activity } from './activity.entity';
import { User } from 'src/users/entities';

@Entity('activity_templates')
export class ActivitiesTemplate extends AppBaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: false, unique: true })
  name: string;

  // Templates can include multiple activities
  @ManyToMany(() => Activity, (activity) => activity.templates)
  @JoinTable({
    name: 'template_activities',
    joinColumn: { name: 'template_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'activity_id', referencedColumnName: 'id' },
  })
  activities: Activity[];

  // Template created by a user
  @ManyToOne(() => User, { nullable: false })
  createdBy: User;
}
