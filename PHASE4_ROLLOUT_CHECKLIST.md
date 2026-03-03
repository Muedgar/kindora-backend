# Phase 4 Rollout Checklist

## Migration Order
1. `1772812800000-phase1-learning-areas-grading-types.ts`
2. `1772899200000-phase2-daily-report-redesign.ts`
3. `1772985600000-phase3-report-snapshots.ts`
4. `1773072000000-pre-phase4-parent-access.ts`
5. `1773162000000-phase4-parent-read-indexes.ts`
6. `1773169200000-phase4-parent-access-permissions.ts`

## Pre-Deploy
1. Confirm `REDISHOST`, `REDISPORT`, `REDIS_PASSWORD` are set (dashboard cache).
2. Confirm parent role includes:
   `read:students`, `read:daily-report`, `read:report-snapshot`, `read:notifications`.
3. Confirm `/parent/*` routes are protected by:
   `JwtAuthGuard`, `SchoolContextGuard`, `PermissionGuard`, `ParentGuard`.

## Deploy
1. Run migrations in order.
2. Restart API workers.
3. Validate Swagger docs include `/parent/*` endpoints.

## Post-Deploy Verification
1. Parent can read only their own children via `/parent/children`.
2. Parent timeline supports `cursor` and returns `nextCursor` with newest-first stable ordering.
3. Parent reports list returns only `PUBLISHED` / `SENT`.
4. Parent dashboard returns contract fields:
   `overall`, `areas`, `activities`, `lastUpdated`.
5. Dashboard cache behavior:
   first request computes live; subsequent request serves cached; publish event invalidates key.

## Rollback
1. Revert newest migrations first:
   `1773169200000`, then `1773162000000`.
2. If needed, disable `/parent/notifications*` routes at gateway while keeping core parent read routes active.
