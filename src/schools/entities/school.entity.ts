import { AppBaseEntity } from 'src/common/entities';
import { User } from 'src/users/entities';
import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { ECountry } from '../enums';
import { SchoolMember } from './school-member.entity';
import { SchoolBranch } from './rwanda/school-branch.entity';

@Entity('schools')
export class School extends AppBaseEntity {
  @Column({ type: 'varchar', length: 200, nullable: false })
  name: string;

  /**
   * Postgres enum array — a school may operate across multiple countries.
   * Rwanda is the default for Kindora v1.
   */
  @Column({
    type: 'enum',
    enum: ECountry,
    array: true,
    nullable: false,
    default: [ECountry.RWANDA],
  })
  countries: ECountry[];

  @Column({ type: 'varchar', length: 200, nullable: false })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  enrollmentCapacity: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @OneToMany(() => SchoolMember, (schoolMember) => schoolMember.school)
  members: SchoolMember[];

  @OneToMany(() => SchoolBranch, (schoolBranch) => schoolBranch.school)
  branches: SchoolBranch[];
}
