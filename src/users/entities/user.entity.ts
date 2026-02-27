import { AppBaseEntity } from 'src/common/entities';
import { Column, Entity, OneToMany } from 'typeorm';
import { SchoolMember } from 'src/schools/entities/school-member.entity';

@Entity('users')
export class User extends AppBaseEntity {
  @Column({ type: 'varchar', length: 200, nullable: true })
  userName: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  firstName: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  lastName: string;

  @Column({ type: 'varchar', length: 100, nullable: false, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 250, nullable: false })
  password: string;

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

  @OneToMany(() => SchoolMember, (schoolMember) => schoolMember.member)
  schools: SchoolMember[];
}
