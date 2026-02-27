import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Branch Architecture Migration
 *
 * Replaces the stale schema from 1745180717980-different-user-management-tables
 * with the correct branch-aware multi-tenant schema:
 *
 *  • users          – adds firstName / lastName, drops legacy userType / rolePkid / schoolPkid
 *  • schools        – countries enum[], created_by_id (ManyToOne, not OneToOne)
 *  • school_branches – Rwanda branch anchor with mandatory rwanda_village_id FK
 *  • school_members  – joins user ↔ school with optional defaultBranch
 *  • school_member_roles – many roles per school member
 *  • staffs         – OneToOne user, ManyToOne school, branches via StaffBranch
 *  • staff_branches  – staff ↔ branch join with isPrimary / date range
 *  • parents        – OneToOne user, ManyToOne school
 *  • classrooms     – branch-anchored (branch_id replaces old school FK)
 *  • students       – branch-anchored (branch_id replaces old parentPkid)
 *  • student_guardians – student ↔ parent guardian link
 *  NOTE: classroom ↔ student is OneToMany/ManyToOne via classroom_id FK on students — no join table.
 *
 * Multi-country rule: when Uganda support is added, a NEW SchoolBranchUganda entity
 * will be introduced with its own location FK — no nullable FK columns on this table.
 */
export class BranchArchitecture1772294400000 implements MigrationInterface {
  name = 'BranchArchitecture1772294400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ─────────────────────────────────────────────────────────────────────────
    // STEP 1 — Tear down stale tables in FK-safe order
    // ─────────────────────────────────────────────────────────────────────────

    // 1a. classrooms_students_students join table
    await queryRunner.query(
      `ALTER TABLE "classrooms_students_students" DROP CONSTRAINT IF EXISTS "FK_6ea2856364fa6c2b0f15870000d"`,
    );
    await queryRunner.query(
      `ALTER TABLE "classrooms_students_students" DROP CONSTRAINT IF EXISTS "FK_f689b6b7165407071b0af243f3b"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_6ea2856364fa6c2b0f15870000"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "public"."IDX_f689b6b7165407071b0af243f3"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "classrooms_students_students"`);

    // 1b. students
    // Drop FK constraints from reports tables that point at students
    // (added by migrations 1754499585979 and 1756389591175)
    await queryRunner.query(
      `ALTER TABLE "report_record" DROP CONSTRAINT IF EXISTS "FK_ea20f276e8e6c851110acaa709f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_report" DROP CONSTRAINT IF EXISTS "FK_87412dfdb48025d3058caf70524"`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" DROP CONSTRAINT IF EXISTS "FK_6ea66e12dd468b414f29b01ff08"`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" DROP CONSTRAINT IF EXISTS "FK_5f43e2f5f63a1f96d05c5e9ddf6"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "students"`);

    // 1c. classrooms
    await queryRunner.query(
      `ALTER TABLE "classrooms" DROP CONSTRAINT IF EXISTS "FK_5886a28722e0d2697d6138e61fd"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "classrooms"`);

    // 1d. staffs
    // Drop FK constraints from reports tables that point at staffs
    // (added by migrations 1754499585979 and 1756389591175)
    await queryRunner.query(
      `ALTER TABLE "report_record" DROP CONSTRAINT IF EXISTS "FK_0a53398175138e40d2565051c35"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_record" DROP CONSTRAINT IF EXISTS "FK_1ae8b27d53e078a11b891e04703"`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_report" DROP CONSTRAINT IF EXISTS "FK_fee6dfdc6c251f264858cc0ae74"`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_report" DROP CONSTRAINT IF EXISTS "FK_9ec3a61848a6dfa1f34b1c0a02b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "staffs" DROP CONSTRAINT IF EXISTS "FK_43448c6f51a6f7d369234ff91d9"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "staffs"`);

    // 1e. parents
    await queryRunner.query(
      `ALTER TABLE "parents" DROP CONSTRAINT IF EXISTS "FK_d33ff7aebe329e9c2765482e385"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "parents"`);

    // 1f. schools — drop FK from users first (users.schoolPkid → schools.pkid)
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_b2f8ba59264d5f5d790e9db911a"`,
    );
    await queryRunner.query(
      `ALTER TABLE "schools" DROP CONSTRAINT IF EXISTS "FK_cf1a824a7803c041af53b8220f1"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "schools"`);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 2 — Alter users: drop legacy columns, add new ones
    // ─────────────────────────────────────────────────────────────────────────

    // Drop the FK that linked users.rolePkid → roles.pkid
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_7152f1f7b25884597d1e49b18f8"`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "userType"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "rolePkid"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "schoolPkid"`,
    );

    // Add firstName / lastName — DEFAULT '' allows this to run on non-empty DBs too
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "firstName" character varying(200) NOT NULL DEFAULT ''`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastName" character varying(200) NOT NULL DEFAULT ''`,
    );

    // Correct emailVerified default to false (old migration used true)
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "emailVerified" SET DEFAULT false`,
    );

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 3 — Create PostgreSQL enum types
    // ─────────────────────────────────────────────────────────────────────────

    await queryRunner.query(
      `DO $$ BEGIN
        CREATE TYPE "public"."schools_countries_enum" AS ENUM('RWANDA');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );

    await queryRunner.query(
      `DO $$ BEGIN
        CREATE TYPE "public"."school_branches_country_enum" AS ENUM('RWANDA');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );

    await queryRunner.query(
      `DO $$ BEGIN
        CREATE TYPE "public"."school_members_status_enum" AS ENUM('ACTIVE', 'SUSPENDED', 'LEFT', 'INVITED');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );

    await queryRunner.query(
      `DO $$ BEGIN
        CREATE TYPE "public"."student_guardians_relationship_enum" AS ENUM('MOTHER', 'FATHER', 'GRANDPARENT', 'AUNT_UNCLE', 'SIBLING', 'LEGAL_GUARDIAN', 'OTHER');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
    );

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 4 — Create schools (correct schema)
    // ─────────────────────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "schools" (
        "pkid"               SERIAL NOT NULL,
        "id"                 uuid NOT NULL DEFAULT uuid_generate_v4(),
        "version"            integer NOT NULL DEFAULT 1,
        "createdAt"          TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"          TIMESTAMP NOT NULL DEFAULT now(),
        "name"               character varying(200) NOT NULL,
        "countries"          "public"."schools_countries_enum"[] NOT NULL DEFAULT '{RWANDA}',
        "phoneNumber"        character varying(200) NOT NULL,
        "enrollmentCapacity" character varying(200),
        "created_by_id"      integer NOT NULL,
        CONSTRAINT "UQ_schools_id"  UNIQUE ("id"),
        CONSTRAINT "PK_schools"     PRIMARY KEY ("pkid")
      )
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 5 — Create school_branches
    // ─────────────────────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "school_branches" (
        "pkid"             SERIAL NOT NULL,
        "id"               uuid NOT NULL DEFAULT uuid_generate_v4(),
        "version"          integer NOT NULL DEFAULT 1,
        "createdAt"        TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"        TIMESTAMP NOT NULL DEFAULT now(),
        "name"             character varying(200) NOT NULL,
        "code"             integer NOT NULL,
        "country"          "public"."school_branches_country_enum" NOT NULL DEFAULT 'RWANDA',
        "address"          text,
        "isMainBranch"     boolean NOT NULL DEFAULT false,
        "rwanda_village_id" integer NOT NULL,
        "school_id"        integer NOT NULL,
        CONSTRAINT "UQ_school_branches_id"          UNIQUE ("id"),
        CONSTRAINT "UQ_school_branches_school_code" UNIQUE ("school_id", "code"),
        CONSTRAINT "PK_school_branches"             PRIMARY KEY ("pkid")
      )
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 6 — Create school_members
    // ─────────────────────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "school_members" (
        "pkid"              SERIAL NOT NULL,
        "id"                uuid NOT NULL DEFAULT uuid_generate_v4(),
        "version"           integer NOT NULL DEFAULT 1,
        "createdAt"         TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"         TIMESTAMP NOT NULL DEFAULT now(),
        "status"            "public"."school_members_status_enum" NOT NULL DEFAULT 'INVITED',
        "isDefault"         boolean NOT NULL DEFAULT false,
        "lastSelectedAt"    TIMESTAMP WITH TIME ZONE,
        "acceptedAt"        TIMESTAMP WITH TIME ZONE,
        "user_id"           integer NOT NULL,
        "school_id"         integer NOT NULL,
        "default_branch_id" integer,
        "invited_by_id"     integer,
        CONSTRAINT "UQ_school_members_id"          UNIQUE ("id"),
        CONSTRAINT "UQ_school_members_school_user"  UNIQUE ("school_id", "user_id"),
        CONSTRAINT "PK_school_members"             PRIMARY KEY ("pkid")
      )
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 7 — Create school_member_roles
    // ─────────────────────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "school_member_roles" (
        "pkid"              SERIAL NOT NULL,
        "id"                uuid NOT NULL DEFAULT uuid_generate_v4(),
        "version"           integer NOT NULL DEFAULT 1,
        "createdAt"         TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"         TIMESTAMP NOT NULL DEFAULT now(),
        "schoolMemberPkid"  integer NOT NULL,
        "rolePkid"          integer NOT NULL,
        CONSTRAINT "UQ_school_member_roles_id"          UNIQUE ("id"),
        CONSTRAINT "UQ_school_member_roles_member_role" UNIQUE ("schoolMemberPkid", "rolePkid"),
        CONSTRAINT "PK_school_member_roles"             PRIMARY KEY ("pkid")
      )
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 8 — Create staffs (correct schema: OneToOne user, ManyToOne school)
    // ─────────────────────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "staffs" (
        "pkid"      SERIAL NOT NULL,
        "id"        uuid NOT NULL DEFAULT uuid_generate_v4(),
        "version"   integer NOT NULL DEFAULT 1,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "position"  character varying(100),
        "user_id"   integer NOT NULL,
        "school_id" integer NOT NULL,
        CONSTRAINT "UQ_staffs_id"      UNIQUE ("id"),
        CONSTRAINT "UQ_staffs_user_id" UNIQUE ("user_id"),
        CONSTRAINT "PK_staffs"         PRIMARY KEY ("pkid")
      )
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 9 — Create parents (correct schema: OneToOne user, ManyToOne school)
    // ─────────────────────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "parents" (
        "pkid"        SERIAL NOT NULL,
        "id"          uuid NOT NULL DEFAULT uuid_generate_v4(),
        "version"     integer NOT NULL DEFAULT 1,
        "createdAt"   TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMP NOT NULL DEFAULT now(),
        "occupation"  character varying(100),
        "phoneNumber" character varying(15),
        "address"     text,
        "user_id"     integer NOT NULL,
        "school_id"   integer NOT NULL,
        CONSTRAINT "UQ_parents_id"      UNIQUE ("id"),
        CONSTRAINT "UQ_parents_user_id" UNIQUE ("user_id"),
        CONSTRAINT "PK_parents"         PRIMARY KEY ("pkid")
      )
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 10 — Create staff_branches (staff ↔ branch join table)
    // ─────────────────────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "staff_branches" (
        "pkid"       SERIAL NOT NULL,
        "id"         uuid NOT NULL DEFAULT uuid_generate_v4(),
        "version"    integer NOT NULL DEFAULT 1,
        "createdAt"  TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"  TIMESTAMP NOT NULL DEFAULT now(),
        "isPrimary"  boolean NOT NULL DEFAULT false,
        "startDate"  date,
        "endDate"    date,
        "staffPkid"  integer NOT NULL,
        "branchPkid" integer NOT NULL,
        CONSTRAINT "UQ_staff_branches_id"           UNIQUE ("id"),
        CONSTRAINT "UQ_staff_branches_staff_branch"  UNIQUE ("staffPkid", "branchPkid"),
        CONSTRAINT "PK_staff_branches"              PRIMARY KEY ("pkid")
      )
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 11 — Create classrooms (branch-anchored)
    // ─────────────────────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "classrooms" (
        "pkid"          SERIAL NOT NULL,
        "id"            uuid NOT NULL DEFAULT uuid_generate_v4(),
        "version"       integer NOT NULL DEFAULT 1,
        "createdAt"     TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"     TIMESTAMP NOT NULL DEFAULT now(),
        "name"          character varying(100) NOT NULL,
        "ageGroup"      character varying(50),
        "capacity"      integer,
        "branch_id"     integer NOT NULL,
        "created_by_id" integer NOT NULL,
        CONSTRAINT "UQ_classrooms_id" UNIQUE ("id"),
        CONSTRAINT "PK_classrooms"    PRIMARY KEY ("pkid")
      )
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 12 — Create students (branch-anchored)
    // ─────────────────────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "students" (
        "pkid"        SERIAL NOT NULL,
        "id"          uuid NOT NULL DEFAULT uuid_generate_v4(),
        "version"     integer NOT NULL DEFAULT 1,
        "createdAt"   TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMP NOT NULL DEFAULT now(),
        "fullName"    character varying(100) NOT NULL,
        "dateOfBirth" date,
        "gender"      character varying(20),
        "notes"       text,
        "branch_id"   integer NOT NULL,
        "classroom_id" integer,
        CONSTRAINT "UQ_students_id" UNIQUE ("id"),
        CONSTRAINT "PK_students"    PRIMARY KEY ("pkid")
      )
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 13 — Create student_guardians
    // ─────────────────────────────────────────────────────────────────────────

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "student_guardians" (
        "pkid"               SERIAL NOT NULL,
        "id"                 uuid NOT NULL DEFAULT uuid_generate_v4(),
        "version"            integer NOT NULL DEFAULT 1,
        "createdAt"          TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"          TIMESTAMP NOT NULL DEFAULT now(),
        "relationship"       "public"."student_guardians_relationship_enum" NOT NULL DEFAULT 'OTHER',
        "canPickup"          boolean NOT NULL DEFAULT false,
        "isEmergencyContact" boolean NOT NULL DEFAULT false,
        "student_id"         integer NOT NULL,
        "parent_id"          integer NOT NULL,
        CONSTRAINT "UQ_student_guardians_id"             UNIQUE ("id"),
        CONSTRAINT "UQ_student_guardians_student_parent" UNIQUE ("student_id", "parent_id"),
        CONSTRAINT "PK_student_guardians"               PRIMARY KEY ("pkid")
      )
    `);

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 14 — Foreign key constraints
    // ─────────────────────────────────────────────────────────────────────────

    // schools
    await queryRunner.query(
      `ALTER TABLE "schools" ADD CONSTRAINT "FK_schools_created_by_id"
       FOREIGN KEY ("created_by_id") REFERENCES "users"("pkid")
       ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    // school_branches
    await queryRunner.query(
      `ALTER TABLE "school_branches" ADD CONSTRAINT "FK_school_branches_rwanda_village_id"
       FOREIGN KEY ("rwanda_village_id") REFERENCES "villages"("pkid")
       ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_branches" ADD CONSTRAINT "FK_school_branches_school_id"
       FOREIGN KEY ("school_id") REFERENCES "schools"("pkid")
       ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    // school_members
    await queryRunner.query(
      `ALTER TABLE "school_members" ADD CONSTRAINT "FK_school_members_user_id"
       FOREIGN KEY ("user_id") REFERENCES "users"("pkid")
       ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_members" ADD CONSTRAINT "FK_school_members_school_id"
       FOREIGN KEY ("school_id") REFERENCES "schools"("pkid")
       ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_members" ADD CONSTRAINT "FK_school_members_default_branch_id"
       FOREIGN KEY ("default_branch_id") REFERENCES "school_branches"("pkid")
       ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_members" ADD CONSTRAINT "FK_school_members_invited_by_id"
       FOREIGN KEY ("invited_by_id") REFERENCES "users"("pkid")
       ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    // school_member_roles
    await queryRunner.query(
      `ALTER TABLE "school_member_roles" ADD CONSTRAINT "FK_school_member_roles_schoolMemberPkid"
       FOREIGN KEY ("schoolMemberPkid") REFERENCES "school_members"("pkid")
       ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_member_roles" ADD CONSTRAINT "FK_school_member_roles_rolePkid"
       FOREIGN KEY ("rolePkid") REFERENCES "roles"("pkid")
       ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );

    // staffs
    await queryRunner.query(
      `ALTER TABLE "staffs" ADD CONSTRAINT "FK_staffs_user_id"
       FOREIGN KEY ("user_id") REFERENCES "users"("pkid")
       ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "staffs" ADD CONSTRAINT "FK_staffs_school_id"
       FOREIGN KEY ("school_id") REFERENCES "schools"("pkid")
       ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    // parents
    await queryRunner.query(
      `ALTER TABLE "parents" ADD CONSTRAINT "FK_parents_user_id"
       FOREIGN KEY ("user_id") REFERENCES "users"("pkid")
       ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "parents" ADD CONSTRAINT "FK_parents_school_id"
       FOREIGN KEY ("school_id") REFERENCES "schools"("pkid")
       ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    // staff_branches
    await queryRunner.query(
      `ALTER TABLE "staff_branches" ADD CONSTRAINT "FK_staff_branches_staffPkid"
       FOREIGN KEY ("staffPkid") REFERENCES "staffs"("pkid")
       ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "staff_branches" ADD CONSTRAINT "FK_staff_branches_branchPkid"
       FOREIGN KEY ("branchPkid") REFERENCES "school_branches"("pkid")
       ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // classrooms
    await queryRunner.query(
      `ALTER TABLE "classrooms" ADD CONSTRAINT "FK_classrooms_branch_id"
       FOREIGN KEY ("branch_id") REFERENCES "school_branches"("pkid")
       ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "classrooms" ADD CONSTRAINT "FK_classrooms_created_by_id"
       FOREIGN KEY ("created_by_id") REFERENCES "users"("pkid")
       ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    // students
    await queryRunner.query(
      `ALTER TABLE "students" ADD CONSTRAINT "FK_students_branch_id"
       FOREIGN KEY ("branch_id") REFERENCES "school_branches"("pkid")
       ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" ADD CONSTRAINT "FK_students_classroom_id"
       FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("pkid")
       ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    // student_guardians
    await queryRunner.query(
      `ALTER TABLE "student_guardians" ADD CONSTRAINT "FK_student_guardians_student_id"
       FOREIGN KEY ("student_id") REFERENCES "students"("pkid")
       ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_guardians" ADD CONSTRAINT "FK_student_guardians_parent_id"
       FOREIGN KEY ("parent_id") REFERENCES "parents"("pkid")
       ON DELETE CASCADE ON UPDATE NO ACTION`,
    );

    // ─────────────────────────────────────────────────────────────────────────
    // STEP 15 — Restore FK constraints on report tables that referenced the
    //           old students / staffs tables (dropped in STEP 1b & 1d above)
    // ─────────────────────────────────────────────────────────────────────────

    // report_record → students
    await queryRunner.query(
      `ALTER TABLE "report_record" ADD CONSTRAINT "FK_ea20f276e8e6c851110acaa709f"
       FOREIGN KEY ("studentPkid") REFERENCES "students"("pkid")
       ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    // report_record → staffs (createdBy / updatedBy)
    await queryRunner.query(
      `ALTER TABLE "report_record" ADD CONSTRAINT "FK_0a53398175138e40d2565051c35"
       FOREIGN KEY ("createdByPkid") REFERENCES "staffs"("pkid")
       ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_record" ADD CONSTRAINT "FK_1ae8b27d53e078a11b891e04703"
       FOREIGN KEY ("updatedByPkid") REFERENCES "staffs"("pkid")
       ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    // daily_report → students
    await queryRunner.query(
      `ALTER TABLE "daily_report" ADD CONSTRAINT "FK_87412dfdb48025d3058caf70524"
       FOREIGN KEY ("studentPkid") REFERENCES "students"("pkid")
       ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );

    // daily_report → staffs (createdBy / updatedBy)
    await queryRunner.query(
      `ALTER TABLE "daily_report" ADD CONSTRAINT "FK_fee6dfdc6c251f264858cc0ae74"
       FOREIGN KEY ("createdByPkid") REFERENCES "staffs"("pkid")
       ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_report" ADD CONSTRAINT "FK_9ec3a61848a6dfa1f34b1c0a02b"
       FOREIGN KEY ("updatedByPkid") REFERENCES "staffs"("pkid")
       ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // ── Drop new tables in reverse FK order ──────────────────────────────────

    await queryRunner.query(
      `ALTER TABLE "student_guardians" DROP CONSTRAINT IF EXISTS "FK_student_guardians_parent_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_guardians" DROP CONSTRAINT IF EXISTS "FK_student_guardians_student_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "student_guardians"`);

    // Drop report-table FKs that reference students before dropping students
    await queryRunner.query(
      `ALTER TABLE "report_record" DROP CONSTRAINT IF EXISTS "FK_ea20f276e8e6c851110acaa709f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_report" DROP CONSTRAINT IF EXISTS "FK_87412dfdb48025d3058caf70524"`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" DROP CONSTRAINT IF EXISTS "FK_students_classroom_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "students" DROP CONSTRAINT IF EXISTS "FK_students_branch_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "students"`);

    await queryRunner.query(
      `ALTER TABLE "classrooms" DROP CONSTRAINT IF EXISTS "FK_classrooms_created_by_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "classrooms" DROP CONSTRAINT IF EXISTS "FK_classrooms_branch_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "classrooms"`);

    await queryRunner.query(
      `ALTER TABLE "staff_branches" DROP CONSTRAINT IF EXISTS "FK_staff_branches_branchPkid"`,
    );
    await queryRunner.query(
      `ALTER TABLE "staff_branches" DROP CONSTRAINT IF EXISTS "FK_staff_branches_staffPkid"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "staff_branches"`);

    await queryRunner.query(
      `ALTER TABLE "parents" DROP CONSTRAINT IF EXISTS "FK_parents_school_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "parents" DROP CONSTRAINT IF EXISTS "FK_parents_user_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "parents"`);

    // Drop report-table FKs that reference staffs before dropping staffs
    await queryRunner.query(
      `ALTER TABLE "report_record" DROP CONSTRAINT IF EXISTS "FK_0a53398175138e40d2565051c35"`,
    );
    await queryRunner.query(
      `ALTER TABLE "report_record" DROP CONSTRAINT IF EXISTS "FK_1ae8b27d53e078a11b891e04703"`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_report" DROP CONSTRAINT IF EXISTS "FK_fee6dfdc6c251f264858cc0ae74"`,
    );
    await queryRunner.query(
      `ALTER TABLE "daily_report" DROP CONSTRAINT IF EXISTS "FK_9ec3a61848a6dfa1f34b1c0a02b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "staffs" DROP CONSTRAINT IF EXISTS "FK_staffs_school_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "staffs" DROP CONSTRAINT IF EXISTS "FK_staffs_user_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "staffs"`);

    await queryRunner.query(
      `ALTER TABLE "school_member_roles" DROP CONSTRAINT IF EXISTS "FK_school_member_roles_rolePkid"`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_member_roles" DROP CONSTRAINT IF EXISTS "FK_school_member_roles_schoolMemberPkid"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "school_member_roles"`);

    await queryRunner.query(
      `ALTER TABLE "school_members" DROP CONSTRAINT IF EXISTS "FK_school_members_invited_by_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_members" DROP CONSTRAINT IF EXISTS "FK_school_members_default_branch_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_members" DROP CONSTRAINT IF EXISTS "FK_school_members_school_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_members" DROP CONSTRAINT IF EXISTS "FK_school_members_user_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "school_members"`);

    await queryRunner.query(
      `ALTER TABLE "school_branches" DROP CONSTRAINT IF EXISTS "FK_school_branches_school_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "school_branches" DROP CONSTRAINT IF EXISTS "FK_school_branches_rwanda_village_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "school_branches"`);

    await queryRunner.query(
      `ALTER TABLE "schools" DROP CONSTRAINT IF EXISTS "FK_schools_created_by_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "schools"`);

    // ── Drop enum types ───────────────────────────────────────────────────────

    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."student_guardians_relationship_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."school_members_status_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."school_branches_country_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."schools_countries_enum"`,
    );

    // ── Restore users to stale schema ────────────────────────────────────────

    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "lastName"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "firstName"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ALTER COLUMN "emailVerified" SET DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "userType" character varying(50) NOT NULL DEFAULT 'user'`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "rolePkid" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "schoolPkid" integer`,
    );
  }
}
