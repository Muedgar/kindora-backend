import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { REQUIRES_BRANCH_ACCESS_KEY } from '../decorators/requires-branch-access.decorator';
import { SchoolMember } from 'src/schools/entities/school-member.entity';
import { Repository } from 'typeorm';
import { SchoolBranch } from 'src/schools/entities/rwanda/school-branch.entity';
import { User } from 'src/users/entities';
import { ESchoolMemberStatus } from 'src/schools/enums';
import { AUTHENTICATION_REQUIRED, BRANCH_CONTEXT_REQUIRED, BRANCH_DOES_NOT_BELONG_TO_SCHOOL, SCHOOL_CONTEXT_REQUIRED, SCHOOL_MEMBER_NOT_FOUND } from '../messages';

@Injectable()
export class BranchContextGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(SchoolMember)
    private schoolMemberRepository: Repository<SchoolMember>,
    @InjectRepository(SchoolBranch)
    private schoolBranchRepository: Repository<SchoolBranch>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: User;
      schoolContext?: {
        schoolId: string;
        schoolMember: SchoolMember;
        branch: SchoolBranch | null;
        permissions: string[];
      };
    }>();

    const requiresBranch = this.reflector.get<boolean>(
      REQUIRES_BRANCH_ACCESS_KEY,
      context.getHandler(),
    );

    const user = request.user;
    if (!user) throw new ForbiddenException(AUTHENTICATION_REQUIRED);

    const schoolId = request.headers['x-school-id'];
    if (!schoolId) {
      if (!requiresBranch) return true;
      throw new BadRequestException(SCHOOL_CONTEXT_REQUIRED);
    }

    const member = await this.schoolMemberRepository.findOne({
      where: {
        member: { id: user.id },
        school: { id: schoolId },
        status: ESchoolMemberStatus.ACTIVE,
      },
      relations: [
        'school',
        'defaultBranch',
        'roles',
        'roles.role',
        'roles.role.permissions',
      ],
    });

    if (!member) {
      throw new ForbiddenException(SCHOOL_MEMBER_NOT_FOUND);
    }

    const requestedBranchId = request.headers['x-branch-id'];
    let branch: SchoolBranch | null = null;

    if (requestedBranchId) {
      branch = await this.schoolBranchRepository.findOne({
        where: {
          id: requestedBranchId,
          school: { id: schoolId },
        },
        relations: ['school'],
      });

      if (!branch) {
        throw new ForbiddenException(
          BRANCH_DOES_NOT_BELONG_TO_SCHOOL,
        );
      }
    } else {
      branch = member.defaultBranch ?? null;
    }

    if (requiresBranch && !branch) {
      throw new BadRequestException(
        BRANCH_CONTEXT_REQUIRED,
      );
    }

    const permissions = [
      ...new Set(
        member.roles
          .flatMap((smr) => smr.role.permissions)
          .map((p) => p.slug),
      ),
    ];

    request.schoolContext = {
      schoolId,
      schoolMember: member,
      branch,
      permissions,
    };

    return true;
  }
}

