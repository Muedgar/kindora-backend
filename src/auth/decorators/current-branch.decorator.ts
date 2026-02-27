import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SchoolBranch } from 'src/schools/entities/rwanda/school-branch.entity';

export const CurrentBranch = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SchoolBranch | null => {
    const request = ctx.switchToHttp().getRequest<{
      schoolContext?: { branch?: SchoolBranch | null };
    }>();
    return request.schoolContext?.branch ?? null;
  },
);

