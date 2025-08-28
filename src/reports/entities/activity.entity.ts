import { AppBaseEntity } from 'src/common/entities';
import { Column, Entity, ManyToMany, ManyToOne, JoinTable } from 'typeorm';
import { ActivitiesTemplate } from './activity-template.entity';
import { User } from 'src/users/entities';
import { GradingLevel } from './grading-level.entity';

@Entity('activities')
export class Activity extends AppBaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: false, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  description: string;

  // Many activities can belong to many templates
  @ManyToMany(() => ActivitiesTemplate, (template) => template.activities)
  templates: ActivitiesTemplate[];

  // Activity created by a user
  @ManyToOne(() => User, { nullable: false })
  createdBy: User;

  // Activities can have many grading levels
  @ManyToMany(() => GradingLevel, (gradingLevel) => gradingLevel.activities)
  @JoinTable({
    name: 'activity_grading_levels', // name of the join table
    joinColumn: { name: 'activity_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'grading_level_id', referencedColumnName: 'id' },
  })
  gradingLevels: GradingLevel[];
}
