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
import { StudentGuardian } from 'src/students/entities/student-guardian.entity';

@Entity('parents')
export class Parent extends AppBaseEntity {
  @OneToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 100, nullable: true })
  occupation: string;

  @Column({ type: 'varchar', length: 15, nullable: true })
  phoneNumber: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  /** Tenant anchor — every parent profile belongs to exactly one school. */
  @ManyToOne(() => School, { nullable: false })
  @JoinColumn({ name: 'school_id' })
  school: School;

  /**
   * All guardian links for this parent.
   * Navigate to StudentGuardian.student to reach enrolled children.
   */
  @OneToMany(() => StudentGuardian, (sg) => sg.parent)
  guardianships: StudentGuardian[];
}
