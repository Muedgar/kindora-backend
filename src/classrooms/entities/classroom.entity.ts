// classroom.entity.ts
import { Column, Entity, JoinTable, ManyToMany, ManyToOne } from 'typeorm';
import { AppBaseEntity } from 'src/common/entities';
import { User } from 'src/users/entities/user.entity';
import { Student } from 'src/students/entities/student.entity';

@Entity('classrooms')
export class Classroom extends AppBaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string; // e.g. "Nursery A", "Blue Room"

  @Column({ type: 'varchar', length: 50, nullable: true })
  ageGroup: string; // e.g. "2-3 years", "Preschool", "Toddlers"

  @Column({ type: 'int', nullable: true })
  capacity: number;

  @ManyToOne(() => User, { nullable: false })
  createdBy: User;

  @ManyToMany(() => Student, { nullable: true })
  @JoinTable()
  students: Student[];
}
