/* eslint-disable @typescript-eslint/no-unsafe-return */
import { AppBaseEntity } from 'src/common/entities';
import { Role } from 'src/roles/roles.entity';
import { Column, Entity, ManyToOne, OneToMany } from 'typeorm';
import { UserType } from '../enums';
import { SchoolMember } from 'src/schools/entities/school-member.entity';

@Entity('users')
export class User extends AppBaseEntity {
  @Column({ type: 'varchar', length: 200, nullable: true })
  userName: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  firstName: any;

  @Column({ type: 'varchar', length: 200, nullable: false })
  lastName: any;

  @Column({ type: 'varchar', length: 100, nullable: false, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 250, nullable: false })
  password: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  userType: UserType;

  @ManyToOne(() => Role, (role) => role.pkid, { nullable: true })
  role: Role;

  @OneToMany(() => SchoolMember, (schoolMember) => schoolMember.member)
  schools: SchoolMember[];

  @Column({ type: 'boolean', nullable: false, default: true })
  status: boolean;

  @Column({ type: 'boolean', nullable: false, default: true })
  isDefaultPassword: boolean;

  @Column({ type: 'boolean', nullable: false, default: false })
  twoFactorAuthentication: boolean;

  @Column({ type: 'boolean', nullable: false, default: false })
  emailVerified: boolean;

  @Column({ type: 'varchar', length: 250, nullable: true })
  emailVerificationKey: string;

  @Column({ type: 'timestamptz', nullable: true })
  emailVerificationExpiry: Date;
}
