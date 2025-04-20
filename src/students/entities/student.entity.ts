// student.entity.ts
import { Column, Entity, ManyToOne } from 'typeorm';
import { AppBaseEntity } from 'src/common/entities';
import { Parent } from 'src/parents/entities/parent.entity';
import { Classroom } from 'src/classrooms/entities/classroom.entity';

@Entity('students')
export class Student extends AppBaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: false })
  fullName: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ type: 'varchar', length: 20, nullable: true })
  gender: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @ManyToOne(() => Parent, { nullable: true })
  parent: Parent;

  @ManyToOne(() => Classroom, (classroom) => classroom.students, {
    nullable: true, // nullable if some students aren't assigned yet
  })
  classroom: Classroom;
}
