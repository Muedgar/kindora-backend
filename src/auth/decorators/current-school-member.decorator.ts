import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SchoolMember } from 'src/schools/entities/school-member.entity';

/**
 * Extracts the current user's SchoolMember record from request.schoolContext,
 * which is populated by BranchContextGuard when X-School-Id header is present.
 * The member includes the school, roles, and defaultBranch relations.
 *
 * Usage (requires BranchContextGuard on the route or controller):
 *   @Get('something')
 *   @UseGuards(JwtAuthGuard, BranchContextGuard)
 *   doSomething(@CurrentSchoolMember() member: SchoolMember) { ... }
 */
export const CurrentSchoolMember = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SchoolMember | null => {
    const request = ctx.switchToHttp().getRequest<{
      schoolContext?: { schoolMember?: SchoolMember };
    }>();
    return request.schoolContext?.schoolMember ?? null;
  },
);
