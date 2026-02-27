import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extracts the current school ID (uuid string) from request.schoolContext,
 * which is populated by BranchContextGuard when X-School-Id header is present.
 *
 * Usage (requires BranchContextGuard on the route or controller):
 *   @Get('something')
 *   @UseGuards(JwtAuthGuard, BranchContextGuard)
 *   doSomething(@CurrentSchool() schoolId: string) { ... }
 */
export const CurrentSchool = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest<{
      schoolContext?: { schoolId?: string };
    }>();
    return request.schoolContext?.schoolId ?? null;
  },
);
