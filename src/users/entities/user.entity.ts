/* eslint-disable @typescript-eslint/no-unsafe-return */
import { AppBaseEntity } from 'src/common/entities';
import { Role } from 'src/roles/roles.entity';
import { Column, Entity, ManyToOne } from 'typeorm';
import { UserType } from '../enums';
import { School } from 'src/schools/entities/school.entity';

@Entity('users')
export class User extends AppBaseEntity {
  @Column({ type: 'varchar', length: 200, nullable: false })
  userName: string;

  @Column({ type: 'varchar', length: 100, nullable: false, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 250, nullable: false })
  password: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  userType: UserType;

  @ManyToOne(() => Role, (role) => role.pkid, { nullable: true })
  role: Role;

  @ManyToOne(() => School, (school) => school.members, {
    nullable: true,
  })
  school: School;

  @Column({ type: 'boolean', nullable: false, default: true })
  status: boolean;

  @Column({ type: 'boolean', nullable: false, default: true })
  isDefaultPassword: boolean;

  @Column({ type: 'boolean', nullable: false, default: false })
  twoFactorAuthentication: boolean;

  @Column({ type: 'boolean', nullable: false, default: true })
  emailVerified: boolean;

  @Column({ type: 'varchar', length: 250, nullable: true })
  emailVerificationKey: string;

  @Column({ type: 'timestamptz', nullable: true })
  emailVerificationExpiry: Date;
  firstName: any;
}
