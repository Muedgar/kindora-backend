# PHASE4 Scaffold Conventions (Internal)

Purpose: define the implementation scaffolding for Phase 4 (Parent App access) so new work aligns with existing Kindora backend patterns.

## 1) Audit Summary (Current Patterns)

### Modules
- Feature modules follow `*.module.ts` with explicit `imports`, `controllers`, `providers`, `exports`.
- `reports` currently contains both staff and parent-consumable logic (`daily-report`, `report-snapshot`), but no dedicated `/parent/*` controller set yet.
- `communication` module is still scaffold-level (stub service/controller), so Phase 4 should only prepare integration points.

### DTOs
- DTO validation is strict (`ValidationPipe` global with `transform`, `whitelist`, `forbidNonWhitelisted`).
- Pagination DTO inheritance pattern exists (`ReportFilterDto extends ListFilterDTO`, `SnapshotFilterDto extends ListFilterDTO`).
- Swagger decorators are used consistently on DTO fields for API docs.

### Serializers
- Serializers use `class-transformer` with `@Expose`, `@Type`, and targeted `@Transform`.
- Base serializer excludes `pkid`, `createdAt`, `updatedAt` by default; serializers can opt in explicitly.
- Decimal fields are normalized in serializers/services (e.g., parse decimal string to number).

### Guards
- Standard guard chain pattern: `@UseGuards(JwtAuthGuard, SchoolContextGuard|BranchContextGuard, PermissionGuard)`.
- `PermissionGuard` assumes context guard already injected `request.schoolContext`.
- Parent/guardian checks are currently implemented in services (not yet a dedicated reusable `ParentGuard`).

### Migrations
- Migrations are manual SQL with strong comments and reversible `down()` blocks.
- Permission seeding is frequently included inside feature migrations.
- Tenant-safe data modeling trend is present (`school_id` FKs + school-scoped queries).

### Seed Permissions
- Multiple permission sets exist historically (`read:reports` legacy + newer report-specific slugs like `read:report-snapshot`, `read:daily-report`).
- New Phase 4 endpoints should use explicit report/parent slugs and avoid relying on broad legacy slugs.

### Response Envelope
- Global `ResponseInterceptor` wraps responses as:
  - `{ statusCode, message, data }`
- Paginated payloads are returned in `data` using `FilterResponse<T>` shape:
  - `{ items, count, pages, previousPage, page, nextPage, limit }`
- There is no global `{ success, meta }` envelope in current runtime behavior.

## 2) Phase 4 Conventions To Follow

### Naming
- Files/classes:
  - `parent-<feature>.controller.ts`
  - `parent-<feature>.service.ts`
  - `Parent<Feature>Controller`, `Parent<Feature>Service`
- DTOs remain in `src/reports/dto` (or a `dto/parent` subfolder if volume grows).
- Serializers remain in `src/reports/serializers` (or `serializers/parent` subfolder if needed).

### Controller / Service Split
- Controllers: route mapping, decorators, guards, minimal parameter orchestration.
- Services: all business rules, guardian checks, school scoping, query logic, serialization composition.
- No raw query logic in controllers.

### Guard Placement (Phase 4)
- Parent endpoints must use:
  - `@UseGuards(JwtAuthGuard, SchoolContextGuard, PermissionGuard, ParentGuard)`
- `ParentGuard` should validate `:studentId` guardianship when present.
- For routes without `:studentId` (e.g., `/parent/children`, `/parent/reports`), service must still constrain by authenticated parent.

### Pagination Shape
- Offset endpoints: keep existing `FilterResponse<T>` in `data`.
- Cursor timeline endpoint: return cursor-specific data shape in `data`, for example:
  - `{ items, nextCursor, pageSize }`
- Do not break global response wrapper (`statusCode/message/data`).

### Serializer Usage
- Always return serializer instances for API responses.
- Keep raw entity internals (`pkid`, audit internals) hidden unless explicitly needed.
- Normalize decimal fields and derived fields in serializer layer.

### School Scoping
- Every parent-facing query must include school constraint (`school_id = ctx.school.pkid`) plus guardian constraint.
- Never depend on client-provided school identifiers beyond `X-School-Id` resolved by `SchoolContextGuard`.
- Parent cannot read across children or across schools, even with valid UUID guesses.

### Migration & Permissions Conventions
- New schema for Phase 4 must be added via dedicated migration(s), each reversible.
- Seed any new permission slugs in migration with idempotent inserts (`ON CONFLICT DO NOTHING`).
- Attach permission slugs to `parent`, `teacher`, `school-admin` explicitly in migration.

## 3) Endpoint Ownership Confirmation

### Existing endpoints that stay staff-facing
- Keep staff workflows on existing paths:
  - `/learning-area/*`
  - `/activity/*`
  - `/grading-level/*`
  - `/activity-template/*`
  - `/daily-report` (create/update/delete and school-wide listing)
  - `/report-snapshot/generate`
  - `/report-snapshot/generate-bulk`
  - `/report-snapshot/admin/summary`
  - `/report-snapshot/:id/review`
  - `/report-snapshot/:id/publish`
  - `/classrooms/*` (including roster extension)

### Existing endpoints to avoid as parent API surface (compatibility only)
- These currently allow parent reads via permissions/service checks, but should not be treated as final Parent App contract:
  - `/daily-report/student/:studentId`
  - `/report-snapshot/*` read endpoints (`GET`, `GET :id`, `GET student/:studentId`, `GET student/:studentId/trends`, `POST :id/mark-read`, `GET unread-count`)

### New endpoints that move to `/parent/*`
- Phase 4 public parent surface should be only under `/parent/*`:
  - `GET /parent/children`
  - `GET /parent/timeline/:studentId` (cursor paginated)
  - `GET /parent/reports`
  - `GET /parent/reports/:id`
  - `GET /parent/dashboard/:studentId`
  - `GET /parent/notifications` (Phase 5 dependency; contract can be scaffolded now)
  - `PATCH /parent/notifications/:id/read` (Phase 5)
  - `PATCH /parent/notifications/read-all` (Phase 5)

## 4) Implementation Notes For Next PR
- Build dedicated parent controllers/services first; keep existing routes stable for staff UI.
- Introduce `ParentGuard` and apply it consistently on all `/parent/*` routes.
- Reuse existing report snapshot and daily report services internally where safe, but expose parent-tailored DTO/serializer contracts.
- Add integration tests for:
  - guardian isolation,
  - cross-school isolation,
  - cursor pagination correctness,
  - hidden observation filtering (`visibleToParents`).

