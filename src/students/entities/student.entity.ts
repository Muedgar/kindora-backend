import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AppBaseEntity } from 'src/common/entities';
import { Classroom } from 'src/classrooms/entities/classroom.entity';
import { SchoolBranch } from 'src/schools/entities/rwanda/school-branch.entity';
import { StudentGuardian } from './student-guardian.entity';
import { School } from 'src/schools/entities/school.entity';

@Entity('students')
export class Student extends AppBaseEntity {
  @Column({ type: 'varchar', length: 100, nullable: false })
  fullName: string;

  @Column({ type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ type: 'varchar', length: 20, nullable: true })
  gender: string;

  /** Care or medical notes — access is restricted by role in queries. */
  @Column({ type: 'text', nullable: true })
  notes: string;

  /**
   * Tenant anchor — every student belongs to one school.
   * Duplicates the school reference from branch for direct scoped queries
   * without an extra join through school_branches.
   */
  @ManyToOne(() => School, { nullable: true })
  @JoinColumn({ name: 'school_id' })
  school: School;

  /** Branch anchor — every student belongs to exactly one branch. */
  @ManyToOne(() => SchoolBranch, { nullable: false })
  @JoinColumn({ name: 'branch_id' })
  branch: SchoolBranch;

  /** Nullable — student may not yet be placed in a classroom. */
  @ManyToOne(() => Classroom, (classroom) => classroom.students, {
    nullable: true,
  })
  @JoinColumn({ name: 'classroom_id' })
  classroom: Classroom;

  /**
   * All guardian links for this student (multi-guardian household support).
   * Filter by StudentGuardian.canPickup / isEmergencyContact as needed.
   */
  @OneToMany(() => StudentGuardian, (sg) => sg.student, { cascade: true })
  guardians: StudentGuardian[];
}
