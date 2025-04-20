// parent.entity.ts
import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { AppBaseEntity } from 'src/common/entities';
import { User } from 'src/users/entities/user.entity';
import { Student } from 'src/students/entities/student.entity';

@Entity('parents')
export class Parent extends AppBaseEntity {
  @OneToOne(() => User, { nullable: false, cascade: true })
  @JoinColumn()
  user: User;

  @Column({ type: 'varchar', length: 100, nullable: true })
  occupation: string;

  @Column({ type: 'varchar', length: 15, nullable: true })
  phoneNumber: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @OneToMany(() => Student, (student) => student.parent, { nullable: true })
  children: Student[];
}
