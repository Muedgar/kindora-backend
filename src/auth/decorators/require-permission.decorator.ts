import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key used by the PermissionsGuard (Phase 5) to look up
 * the required permission slugs for a given route handler.
 */
export const REQUIRE_PERMISSION_KEY = 'require_permission';

/**
 * Declares that the decorated route requires the caller to hold ALL of the
 * specified permission slugs within the resolved school context.
 *
 * Enforcement is performed by PermissionsGuard (Phase 5). Applying this
 * decorator alone has no effect; the guard must also be registered.
 *
 * Usage:
 *   @Get('users')
 *   @UseGuards(JwtAuthGuard, SchoolContextGuard, PermissionsGuard)
 *   @RequirePermission('read:users')
 *   listUsers(@GetSchoolContext() ctx: SchoolContext) { ... }
 *
 * @param slugs  One or more permission slugs in "action:resource" format.
 */
export const RequirePermission = (...slugs: string[]) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, slugs);
