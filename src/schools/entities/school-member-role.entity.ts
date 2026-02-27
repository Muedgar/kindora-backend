import { AppBaseEntity } from 'src/common/entities';
import { Entity, ManyToOne, Unique } from 'typeorm';
import { Role } from 'src/roles/roles.entity';
import { SchoolMember } from './school-member.entity';

/**
 * Joins a SchoolMember to one Role within that school.
 * A member may hold multiple roles (one row per role).
 * The unique constraint prevents duplicate role assignments.
 */
@Entity('school_member_roles')
@Unique(['schoolMember', 'role'])
export class SchoolMemberRole extends AppBaseEntity {
  @ManyToOne(() => SchoolMember, (member) => member.roles, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  schoolMember: SchoolMember;

  @ManyToOne(() => Role, { nullable: false, eager: true, onDelete: 'RESTRICT' })
  role: Role;
}
