import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { AppBaseEntity } from 'src/common/entities';
import { User } from 'src/users/entities/user.entity';
import { School } from 'src/schools/entities/school.entity';
import { StaffBranch } from './staff-branch.entity';

@Entity('staffs')
export class Staff extends AppBaseEntity {
  @OneToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 100, nullable: true })
  position: string;

  /** Tenant anchor — every staff profile belongs to exactly one school. */
  // this is how it was but change it so that staff can actually belong to multiple schools for people who have multiple jobs.
  // and to keep records for when staff moves to another school.
  @ManyToOne(() => School, { nullable: false })
  @JoinColumn({ name: 'school_id' })
  school: School;

  @OneToMany(() => StaffBranch, (staffBranch) => staffBranch.staff, {
    cascade: true,
  })
  branches: StaffBranch[];
}
