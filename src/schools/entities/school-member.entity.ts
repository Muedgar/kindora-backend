import { AppBaseEntity } from 'src/common/entities';
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { User } from 'src/users/entities';
import { School } from './school.entity';

@Entity('school_member')
@Unique(['school', 'member'])
export class SchoolMember extends AppBaseEntity {
  @ManyToOne(() => User, (user) => user.pkid, {
    nullable: false,
  })
  @JoinColumn({ name: 'user_id' })
  member: User;

  @ManyToOne(() => School, (school) => school.pkid, { nullable: false })
  @JoinColumn({ name: 'school_id' })
  school: School;
}
