import { AppBaseEntity } from 'src/common/entities';
import { Column, Entity, JoinTable, ManyToMany, ManyToOne } from 'typeorm';
import { Activity } from './activity.entity';
import { User } from 'src/users/entities';

@Entity('categories')
export class Category extends AppBaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: false, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  description: string;

  // Categories can include multiple activities
  @ManyToMany(() => Activity, (activity) => activity.categories)
  @JoinTable({
    name: 'category_activities',
    joinColumn: { name: 'category_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'activity_id', referencedColumnName: 'id' },
  })
  activities: Activity[];

  // Template created by a user
  @ManyToOne(() => User, { nullable: false })
  createdBy: User;
}
