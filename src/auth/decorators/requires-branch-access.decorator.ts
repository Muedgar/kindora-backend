import { SetMetadata } from '@nestjs/common';

export const REQUIRES_BRANCH_ACCESS_KEY = 'requiresBranchAccess';
export const RequiresBranchAccess = () =>
  SetMetadata(REQUIRES_BRANCH_ACCESS_KEY, true);

