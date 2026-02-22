import { AppBaseEntity } from 'src/common/entities';
import { User } from 'src/users/entities';
import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { ECountry } from '../enums';
import { SchoolMember } from './school-member.entity';
import { SchoolLocation } from './rwanda/school-location.entity';

/*
School or program details 
(school or program name, 
program type (preschool, after school), 
phone number, 
enrollment capacity, 
country, 
state / region)
*/

@Entity('schools')
export class School extends AppBaseEntity {
  @Column({ type: 'varchar', length: 200, nullable: false })
  name: string;

  @Column({ type: 'enum', nullable: false })
  countries: ECountry[];

  @Column({ type: 'varchar', length: 200, nullable: false })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  enrollmentCapacity: string;

  @OneToOne(() => User, { nullable: false })
  @JoinColumn()
  createdBy: User;

  @OneToMany(() => SchoolMember, (schoolMember) => schoolMember.school)
  members: SchoolMember[];

  @OneToMany(() => SchoolLocation, (schoolLocation) => schoolLocation.school)
  locations: SchoolLocation[];
}
