import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SchoolContext } from '../interfaces/school-context.interface';

/**
 * Extracts the full SchoolContext object from the request.
 * Populated by SchoolContextGuard after it verifies the user's membership
 * and loads their permissions.
 *
 * Usage (requires JwtAuthGuard + SchoolContextGuard on the route):
 *   @Get('something')
 *   @UseGuards(JwtAuthGuard, SchoolContextGuard)
 *   doSomething(@GetSchoolContext() ctx: SchoolContext) { ... }
 */
export const GetSchoolContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SchoolContext | null => {
    const request = ctx.switchToHttp().getRequest<{
      schoolContext?: SchoolContext;
    }>();
    return request.schoolContext ?? null;
  },
);
