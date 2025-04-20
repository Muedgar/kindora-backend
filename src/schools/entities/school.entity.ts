import { AppBaseEntity } from 'src/common/entities';
import { User } from 'src/users/entities';
import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';

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

  @Column({ type: 'varchar', length: 200, nullable: false })
  address: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  city: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  country: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  phoneNumber: string;

  @Column({ type: 'varchar', length: 200, nullable: false })
  enrollmentCapacity: string;

  @OneToOne(() => User, { nullable: false })
  @JoinColumn()
  createdBy: User;

  @OneToMany(() => User, (user) => user.school, { nullable: true })
  members: User[];
}
