import { School } from 'src/schools/entities/school.entity';
import { SchoolBranch } from 'src/schools/entities/rwanda/school-branch.entity';
import { SchoolMember } from 'src/schools/entities/school-member.entity';

/**
 * Unified per-request school context shape.
 *
 * Set by SchoolContextGuard for pure school-scoped routes, and by
 * BranchContextGuard for branch-scoped routes.  Both guards populate
 * `school` and `permissions`; `branch` is only present when
 * BranchContextGuard has resolved a valid branch for the request.
 *
 * permissions — deduplicated slugs of every permission the member holds
 * via ALL of their roles (e.g. "manage:users", "read:classrooms").
 */
export interface SchoolContext {
  /** The resolved School entity — always set by both guards. */
  school: School;

  /** Membership record set by SchoolContextGuard. */
  member?: SchoolMember;

  /**
   * Membership record set by BranchContextGuard.
   * Alias for `member`; prefer `member` on pure school-context routes.
   */
  schoolMember?: SchoolMember;

  /** Branch resolved by BranchContextGuard; null if not required / not sent. */
  branch?: SchoolBranch | null;

  /** All permission slugs the caller holds within this school. */
  permissions: string[];
}
