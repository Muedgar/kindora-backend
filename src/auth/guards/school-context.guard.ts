import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SchoolMember } from 'src/schools/entities/school-member.entity';
import { User } from 'src/users/entities';
import { ESchoolMemberStatus } from 'src/schools/enums';
import {
  AUTHENTICATION_REQUIRED,
  MEMBERSHIP_NOT_ACTIVE,
  SCHOOL_CONTEXT_REQUIRED,
  SCHOOL_MEMBER_NOT_FOUND,
} from '../messages';
import { SchoolContext } from '../interfaces/school-context.interface';

/**
 * SchoolContextGuard — Phase 3 guard.
 *
 * Reads X-School-Id from the request header, verifies that the authenticated
 * user holds an ACTIVE membership in that school, loads the full permission
 * tree, and injects the resolved SchoolContext into `request.schoolContext`.
 *
 * Use on routes that need permission-level access control (e.g. /me, RBAC).
 * For simpler branch-level context (no permissions), use BranchContextGuard.
 *
 * request.schoolContext shape after this guard:
 *   { school, member, permissions: string[] }
 */
@Injectable()
export class SchoolContextGuard implements CanActivate {
  constructor(
    @InjectRepository(SchoolMember)
    private readonly memberRepo: Repository<SchoolMember>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: User;
      schoolContext?: SchoolContext;
    }>();

    const user = request.user;
    if (!user) throw new ForbiddenException(AUTHENTICATION_REQUIRED);

    const schoolId = request.headers['x-school-id'];
    if (!schoolId) throw new BadRequestException(SCHOOL_CONTEXT_REQUIRED);

    const member = await this.memberRepo.findOne({
      where: {
        member: { id: user.id },
        school: { id: schoolId },
      },
      relations: ['school', 'roles', 'roles.role', 'roles.role.permissions'],
    });

    if (!member) throw new ForbiddenException(SCHOOL_MEMBER_NOT_FOUND);

    if (member.status !== ESchoolMemberStatus.ACTIVE) {
      throw new ForbiddenException(MEMBERSHIP_NOT_ACTIVE);
    }

    const permissions = [
      ...new Set(
        member.roles
          .flatMap((smr) => smr.role.permissions)
          .map((p) => p.slug),
      ),
    ];

    request.schoolContext = { school: member.school, member, permissions };

    return true;
  }
}
