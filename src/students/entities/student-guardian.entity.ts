import { AppBaseEntity } from 'src/common/entities';
import { Column, Entity, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { Parent } from 'src/parents/entities/parent.entity';
import { EGuardianRelationship } from '../enums/guardian-relationship.enum';
import { Student } from './student.entity';

/**
 * Links a Parent (user account) to a Student with household context.
 * Supports multi-guardian households: a student can have many guardians,
 * and a parent can be guardian to many students.
 */
@Entity('student_guardians')
@Unique(['student', 'parent'])
export class StudentGuardian extends AppBaseEntity {
  @ManyToOne(() => Student, (student) => student.guardians, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @ManyToOne(() => Parent, (parent) => parent.guardianships, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parent_id' })
  parent: Parent;

  @Column({
    type: 'enum',
    enum: EGuardianRelationship,
    nullable: false,
    default: EGuardianRelationship.OTHER,
  })
  relationship: EGuardianRelationship;

  /** Whether this guardian is authorised to pick up the child. */
  @Column({ type: 'boolean', nullable: false, default: false })
  canPickup: boolean;

  /** Whether this guardian should be contacted in an emergency. */
  @Column({ type: 'boolean', nullable: false, default: false })
  isEmergencyContact: boolean;
}
