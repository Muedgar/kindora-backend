import { AppBaseEntity } from 'src/common/entities';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Unique,
} from 'typeorm';
import { User } from 'src/users/entities';
import { School } from './school.entity';
import { SchoolMemberRole } from './school-member-role.entity';
import { ESchoolMemberStatus } from '../enums';
import { SchoolBranch } from './rwanda/school-branch.entity';

@Entity('school_members')
@Unique(['school', 'member'])
export class SchoolMember extends AppBaseEntity {
  @ManyToOne(() => User, (user) => user.schools, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  member: User;

  @ManyToOne(() => School, (school) => school.members, { nullable: false })
  @JoinColumn({ name: 'school_id' })
  school: School;

  @ManyToOne(() => SchoolBranch, { nullable: true })
  @JoinColumn({ name: 'default_branch_id' })
  defaultBranch: SchoolBranch;

  @Column({
    type: 'enum',
    enum: ESchoolMemberStatus,
    nullable: false,
    default: ESchoolMemberStatus.INVITED,
  })
  status: ESchoolMemberStatus;

  @Column({ type: 'boolean', nullable: false, default: false })
  isDefault: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  lastSelectedAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  acceptedAt: Date;

  /** User who sent the invitation. Many members can be invited by the same user. */
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'invited_by_id' })
  invitedBy: User;

  /** All role assignments for this member within this school. */
  @OneToMany(() => SchoolMemberRole, (smr) => smr.schoolMember, {
    cascade: true,
  })
  roles: SchoolMemberRole[];
}
