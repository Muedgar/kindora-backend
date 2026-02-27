import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { AppBaseEntity } from 'src/common/entities';
import { User } from 'src/users/entities/user.entity';
import { Student } from 'src/students/entities/student.entity';
import { SchoolBranch } from 'src/schools/entities/rwanda/school-branch.entity';
import { School } from 'src/schools/entities/school.entity';

@Entity('classrooms')
export class Classroom extends AppBaseEntity {
  /** e.g. "Nursery A", "Blue Room" */
  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  /** e.g. "2-3 years", "Preschool", "Toddlers" */
  @Column({ type: 'varchar', length: 50, nullable: true })
  ageGroup: string;

  @Column({ type: 'int', nullable: true })
  capacity: number;

  /**
   * Tenant anchor — every classroom belongs to one school.
   * Duplicates the school reference from branch for direct scoped queries
   * without an extra join through school_branches.
   */
  @ManyToOne(() => School, { nullable: true })
  @JoinColumn({ name: 'school_id' })
  school: School;

  /** Branch anchor — every classroom belongs to exactly one branch. */
  @ManyToOne(() => SchoolBranch, { nullable: false })
  @JoinColumn({ name: 'branch_id' })
  branch: SchoolBranch;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  /**
   * Students currently enrolled in this classroom.
   * A student belongs to at most one classroom at a time — the FK lives on
   * the students table (classroom_id), so no join table is needed.
   */
  @OneToMany(() => Student, (student) => student.classroom)
  students: Student[];
}
