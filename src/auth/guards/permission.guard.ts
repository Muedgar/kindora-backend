import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { REQUIRE_PERMISSION_KEY } from '../decorators/require-permission.decorator';
import { INSUFFICIENT_PERMISSIONS } from '../messages';

/**
 * PermissionGuard — Phase 5 guard.
 *
 * Reads the list of required permission slugs attached via @RequirePermission()
 * and verifies that the resolved school context (set by SchoolContextGuard or
 * BranchContextGuard) contains ALL of them.
 *
 * Must be placed AFTER JwtAuthGuard and SchoolContextGuard / BranchContextGuard
 * in the @UseGuards() chain so that request.schoolContext is already populated.
 *
 * Usage:
 *   @UseGuards(JwtAuthGuard, SchoolContextGuard, PermissionGuard)
 *   @RequirePermission('manage:users')
 *   createUser(...) { ... }
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.get<string[] | undefined>(
      REQUIRE_PERMISSION_KEY,
      context.getHandler(),
    );

    // No permission metadata — let the request through.
    if (!required?.length) return true;

    const request = context.switchToHttp().getRequest<{
      schoolContext?: { permissions: string[] };
    }>();

    const permissions = request.schoolContext?.permissions ?? [];

    console.log("required permissions:  ", required)
    console.log("user permissions: ", permissions)

    const hasAll = required.every((slug) => permissions.includes(slug));

    if (!hasAll) throw new ForbiddenException(INSUFFICIENT_PERMISSIONS);

    return true;
  }
}
