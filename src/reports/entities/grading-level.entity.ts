import { AppBaseEntity } from 'src/common/entities';
import { Column, Entity, ManyToOne, ManyToMany } from 'typeorm';
import { User } from 'src/users/entities';
import { Activity } from './activity.entity';

@Entity('grading_level')
export class GradingLevel extends AppBaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: false, unique: true })
  name: string;

  // GradingLevel created by a user
  @ManyToOne(() => User, { nullable: false })
  createdBy: User;

  // GradingLevels can belong to many activities
  @ManyToMany(() => Activity, (activity) => activity.gradingLevels)
  activities: Activity[];
}
