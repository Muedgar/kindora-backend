/**
 * KindoraSeederService
 *
 * Seeds a freshly reset Kindora database with:
 *  1. Permissions  (19, action:resource slugs)
 *  2. Roles        (4: SUPER_ADMIN, SCHOOL_ADMIN, TEACHER, PARENT)
 *  3. Location     (Province → District → Sector → Cell → Village for Kigali + Huye)
 *  4. Users        (5 test accounts — passwords hashed with bcrypt)
 *  5. Schools      (Kindora Kigali, Kindora Huye)
 *  6. SchoolBranches
 *  7. SchoolMembers + SchoolMemberRoles (tenant + RBAC assignments)
 *  8. Staff profile (teacher)
 *  9. Parent profiles (parent1, parent2)
 * 10. Classroom    (Nursery A — Kigali)
 * 11. Students     (2, assigned to Nursery A)
 * 12. StudentGuardians (multi-guardian household links)
 *
 * Called by seed-all.ts — do not instantiate directly.
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';

// ── Entities ──────────────────────────────────────────────────────────────
import { Permission } from 'src/permissions/entities/permission.entity';
import { Role } from 'src/roles/roles.entity';
import { User } from 'src/users/entities/user.entity';
import { School } from 'src/schools/entities/school.entity';
import { SchoolMember } from 'src/schools/entities/school-member.entity';
import { SchoolMemberRole } from 'src/schools/entities/school-member-role.entity';
import { SchoolBranch } from 'src/schools/entities/rwanda/school-branch.entity';
import { Village } from 'src/location/rwanda/village/village.entity';
import { Classroom } from 'src/classrooms/entities/classroom.entity';
import { Student } from 'src/students/entities/student.entity';
import { StudentGuardian } from 'src/students/entities/student-guardian.entity';
import { Parent } from 'src/parents/entities/parent.entity';
import { Staff } from 'src/staffs/entities/staff.entity';
import { StaffBranch } from 'src/staffs/entities/staff-branch.entity';

// ── Enums ─────────────────────────────────────────────────────────────────
import { ESchoolMemberStatus } from 'src/schools/enums';
import { ECountry } from 'src/schools/enums';
import { EGuardianRelationship } from 'src/students/enums/guardian-relationship.enum';

// ── Permission slug constants (action:resource) ───────────────────────────
const P = {
  // Users
  READ_USERS: 'read:users',
  WRITE_USERS: 'write:users',
  DELETE_USERS: 'delete:users',
  MANAGE_USERS: 'manage:users',
  // Schools
  READ_SCHOOLS: 'read:schools',
  WRITE_SCHOOLS: 'write:schools',
  MANAGE_SCHOOLS: 'manage:schools',
  // Classrooms
  READ_CLASSROOMS: 'read:classrooms',
  WRITE_CLASSROOMS: 'write:classrooms',
  DELETE_CLASSROOMS: 'delete:classrooms',
  MANAGE_CLASSROOMS: 'manage:classrooms',
  // Students
  READ_STUDENTS: 'read:students',
  WRITE_STUDENTS: 'write:students',
  DELETE_STUDENTS: 'delete:students',
  MANAGE_STUDENTS: 'manage:students',
  // Reports
  READ_REPORTS: 'read:reports',
  WRITE_REPORTS: 'write:reports',
  // Check-in / Check-out
  READ_CHECKINOUT: 'read:checkinout',
  MANAGE_CHECKINOUT: 'manage:checkinout',
} as const;

type PermSlug = (typeof P)[keyof typeof P];

// ── Role permission matrices ───────────────────────────────────────────────
const ROLE_PERMISSIONS: Record<string, PermSlug[]> = {
  SUPER_ADMIN: Object.values(P) as PermSlug[],

  SCHOOL_ADMIN: [
    P.READ_USERS, P.WRITE_USERS, P.DELETE_USERS, P.MANAGE_USERS,
    P.READ_SCHOOLS, P.WRITE_SCHOOLS, P.MANAGE_SCHOOLS,
    P.READ_CLASSROOMS, P.WRITE_CLASSROOMS, P.DELETE_CLASSROOMS, P.MANAGE_CLASSROOMS,
    P.READ_STUDENTS, P.WRITE_STUDENTS, P.DELETE_STUDENTS, P.MANAGE_STUDENTS,
    P.READ_REPORTS, P.WRITE_REPORTS,
    P.READ_CHECKINOUT, P.MANAGE_CHECKINOUT,
  ],

  TEACHER: [
    P.READ_CLASSROOMS,
    P.READ_STUDENTS, P.WRITE_STUDENTS,
    P.READ_REPORTS,
    P.READ_CHECKINOUT, P.MANAGE_CHECKINOUT,
  ],

  PARENT: [
    P.READ_STUDENTS,
    P.READ_CHECKINOUT,
  ],
};

// ── Test user credentials ─────────────────────────────────────────────────
const SEED_PASSWORD_PLAIN = 'Kindora@2025';
const SALT_ROUNDS = 10;
@Injectable()
export class KindoraSeederService {
  private readonly logger = new Logger(KindoraSeederService.name);

  constructor(
    @InjectRepository(Permission) private permRepo: Repository<Permission>,
    @InjectRepository(Role)       private roleRepo: Repository<Role>,
    @InjectRepository(User)       private userRepo: Repository<User>,
    @InjectRepository(School)     private schoolRepo: Repository<School>,
    @InjectRepository(SchoolMember)     private memberRepo: Repository<SchoolMember>,
    @InjectRepository(SchoolMemberRole) private memberRoleRepo: Repository<SchoolMemberRole>,
    @InjectRepository(SchoolBranch)   private schoolBranchRepo: Repository<SchoolBranch>,
    @InjectRepository(Village)   private villageRepo: Repository<Village>,
    @InjectRepository(Classroom) private classroomRepo: Repository<Classroom>,
    @InjectRepository(Student)   private studentRepo: Repository<Student>,
    @InjectRepository(StudentGuardian) private guardianRepo: Repository<StudentGuardian>,
    @InjectRepository(Parent)    private parentRepo: Repository<Parent>,
    @InjectRepository(Staff)     private staffRepo: Repository<Staff>,
    @InjectRepository(StaffBranch)
    private staffBranchRepo: Repository<StaffBranch>,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════
  //  Public entry point
  // ═══════════════════════════════════════════════════════════════════════

  async seed(): Promise<void> {
    this.logger.log('🌱  Starting Kindora seed…');

    const passwordHash = await bcrypt.hash(SEED_PASSWORD_PLAIN, SALT_ROUNDS);

    const permMap   = await this.seedPermissions();
    const roleMap   = await this.seedRoles(permMap);
    const locations = await this.getSeedLocationReferences();
    const users     = await this.seedUsers(passwordHash);
    const seededSchools = await this.seedSchools(users.superAdmin, locations);
    await this.seedSchoolMemberships(
      users,
      seededSchools.schools,
      seededSchools.branches,
      roleMap,
    );
    await this.seedStaffProfile(users.teacher, seededSchools.schools.kigali, seededSchools.branches.kigali);
    const parents   = await this.seedParentProfiles(users, seededSchools.schools.kigali);
    const classroom = await this.seedClassroom(seededSchools.branches.kigali, users.superAdmin);
    const students  = await this.seedStudents(seededSchools.branches.kigali, classroom);
    await this.seedGuardianLinks(students, parents);

    this.logger.log('✅  Seed complete.\n');
    this.printCredentials();
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Step 1 — Permissions
  // ═══════════════════════════════════════════════════════════════════════

  private async seedPermissions(): Promise<Map<PermSlug, Permission>> {
    this.logger.log('  [1/12] Seeding permissions…');

    const definitions: { name: string; slug: PermSlug }[] = [
      { name: 'Read Users',        slug: P.READ_USERS },
      { name: 'Write Users',       slug: P.WRITE_USERS },
      { name: 'Delete Users',      slug: P.DELETE_USERS },
      { name: 'Manage Users',      slug: P.MANAGE_USERS },
      { name: 'Read Schools',      slug: P.READ_SCHOOLS },
      { name: 'Write Schools',     slug: P.WRITE_SCHOOLS },
      { name: 'Manage Schools',    slug: P.MANAGE_SCHOOLS },
      { name: 'Read Classrooms',   slug: P.READ_CLASSROOMS },
      { name: 'Write Classrooms',  slug: P.WRITE_CLASSROOMS },
      { name: 'Delete Classrooms', slug: P.DELETE_CLASSROOMS },
      { name: 'Manage Classrooms', slug: P.MANAGE_CLASSROOMS },
      { name: 'Read Students',     slug: P.READ_STUDENTS },
      { name: 'Write Students',    slug: P.WRITE_STUDENTS },
      { name: 'Delete Students',   slug: P.DELETE_STUDENTS },
      { name: 'Manage Students',   slug: P.MANAGE_STUDENTS },
      { name: 'Read Reports',      slug: P.READ_REPORTS },
      { name: 'Write Reports',     slug: P.WRITE_REPORTS },
      { name: 'Read Check-In/Out',   slug: P.READ_CHECKINOUT },
      { name: 'Manage Check-In/Out', slug: P.MANAGE_CHECKINOUT },
    ];

    const saved = await this.permRepo.save(
      definitions.map((d) => this.permRepo.create({ name: d.name, slug: d.slug })),
    );

    const map = new Map<PermSlug, Permission>();
    for (const perm of saved) {
      map.set(perm.slug as PermSlug, perm);
    }

    this.logger.log(`     → ${saved.length} permissions created.`);
    return map;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Step 2 — Roles
  // ═══════════════════════════════════════════════════════════════════════

  private async seedRoles(
    permMap: Map<PermSlug, Permission>,
  ): Promise<Map<string, Role>> {
    this.logger.log('  [2/12] Seeding roles…');

    const roleDefinitions = [
      { name: 'Super Admin',   slug: 'super_admin',   permSlugs: ROLE_PERMISSIONS.SUPER_ADMIN },
      { name: 'School Admin',  slug: 'school_admin',  permSlugs: ROLE_PERMISSIONS.SCHOOL_ADMIN },
      { name: 'Teacher',       slug: 'teacher',       permSlugs: ROLE_PERMISSIONS.TEACHER },
      { name: 'Parent',        slug: 'parent',        permSlugs: ROLE_PERMISSIONS.PARENT },
    ];

    const map = new Map<string, Role>();

    for (const def of roleDefinitions) {
      const permissions = def.permSlugs.map((slug) => {
        const perm = permMap.get(slug);
        if (!perm) throw new Error(`Permission not found: ${slug}`);
        return perm;
      });

      const role = this.roleRepo.create({
        name: def.name,
        slug: def.slug,
        permissions,
      });

      const saved = await this.roleRepo.save(role);
      map.set(def.slug, saved);
    }

    this.logger.log(`     → ${map.size} roles created.`);
    return map;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Step 3 — Rwanda location hierarchy (minimal seed)
  // ═══════════════════════════════════════════════════════════════════════

  private async getSeedLocationReferences(): Promise<{
    kigaliVillage: Village;
    huyeVillage: Village;
  }> {
    const kigaliVillage = await this.pickSampleVillageByDistrict('Nyarugenge');
    const huyeVillage = await this.pickSampleVillageByDistrict('Huye');

    if (!kigaliVillage || !huyeVillage) {
      throw new Error(
        'Rwanda locations are missing. Run `npm run seed:rwanda` first.',
      );
    }

    this.logger.log('  [3/12] Rwanda locations detected.');

    return { kigaliVillage, huyeVillage };
  }

  private async pickSampleVillageByDistrict(
    districtName: string,
  ): Promise<Village | null> {
    return this.villageRepo
      .createQueryBuilder('village')
      .innerJoin('village.cell', 'cell')
      .innerJoin('cell.sector', 'sector')
      .innerJoin('sector.district', 'district')
      .where('district.name = :districtName', { districtName })
      .orderBy('village.name', 'ASC')
      .getOne();
  }


  // ═══════════════════════════════════════════════════════════════════════
  //  Step 4 — Test users
  // ═══════════════════════════════════════════════════════════════════════

  private async seedUsers(passwordHash: string): Promise<{
    superAdmin: User;
    schoolAdmin: User;
    teacher: User;
    parent1: User;
    parent2: User;
  }> {
    this.logger.log('  [4/12] Seeding test users…');

    const userDefs = [
      { firstName: 'Edgar',   lastName: 'Mutangana',  email: 'super@kindora.rw',      userName: 'super.admin' },
      { firstName: 'Alice',   lastName: 'Ingabire',   email: 'admin.kgl@kindora.rw',  userName: 'alice.admin' },
      { firstName: 'Jean',    lastName: 'Bosco',      email: 'teacher.kgl@kindora.rw', userName: 'jean.teacher' },
      { firstName: 'Marie',   lastName: 'Uwimana',    email: 'parent1.kgl@kindora.rw', userName: 'marie.parent' },
      { firstName: 'Patrick', lastName: 'Nkurunziza', email: 'parent2.kgl@kindora.rw', userName: 'patrick.parent' },
    ];

    const saved = await this.userRepo.save(
      userDefs.map((u) =>
        this.userRepo.create({
          ...u,
          password: passwordHash,
          status: true,
          isDefaultPassword: true,   // signal to prompt password change on first login
          emailVerified: true,
          twoFactorAuthentication: false,
        }),
      ),
    );

    const [superAdmin, schoolAdmin, teacher, parent1, parent2] = saved;
    this.logger.log(`     → ${saved.length} users created.`);
    return { superAdmin, schoolAdmin, teacher, parent1, parent2 };
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Step 5 — Schools + Branches
  // ═══════════════════════════════════════════════════════════════════════

  private async seedSchools(
    createdBy: User,
    locations: { kigaliVillage: Village; huyeVillage: Village },
  ): Promise<{
    schools: { kigali: School; huye: School };
    branches: { kigali: SchoolBranch; huye: SchoolBranch };
  }> {
    this.logger.log('  [5/12] Seeding schools…');

    const [kigali, huye] = await this.schoolRepo.save([
      this.schoolRepo.create({
        name: 'Kindora Kigali',
        countries: [ECountry.RWANDA],
        phoneNumber: '+250788000001',
        enrollmentCapacity: '200',
        createdBy,
      }),
      this.schoolRepo.create({
        name: 'Kindora Huye',
        countries: [ECountry.RWANDA],
        phoneNumber: '+250788000002',
        enrollmentCapacity: '150',
        createdBy,
      }),
    ]);

    const [kigaliBranch, huyeBranch] = await this.schoolBranchRepo.save([
      this.schoolBranchRepo.create({
        name: 'Main Campus - Kigali',
        code: 101,
        school: kigali,
        country: ECountry.RWANDA,
        rwandaVillage: locations.kigaliVillage,
        address: 'Nyarugenge, Kigali',
        isMainBranch: true,
      }),
      this.schoolBranchRepo.create({
        name: 'Main Campus - Huye',
        code: 201,
        school: huye,
        country: ECountry.RWANDA,
        rwandaVillage: locations.huyeVillage,
        address: 'Ngoma, Huye',
        isMainBranch: true,
      }),
    ]);

    this.logger.log('     → 2 schools + 2 branches created.');
    return {
      schools: { kigali, huye },
      branches: { kigali: kigaliBranch, huye: huyeBranch },
    };
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Step 6 — SchoolMembers + SchoolMemberRoles
  // ═══════════════════════════════════════════════════════════════════════

  private async seedSchoolMemberships(
    users: { superAdmin: User; schoolAdmin: User; teacher: User; parent1: User; parent2: User },
    schools: { kigali: School; huye: School },
    branches: { kigali: SchoolBranch; huye: SchoolBranch },
    roleMap: Map<string, Role>,
  ): Promise<void> {
    this.logger.log('  [6/12] Seeding school memberships…');

    const superAdminRole  = roleMap.get('super_admin')!;
    const schoolAdminRole = roleMap.get('school_admin')!;
    const teacherRole     = roleMap.get('teacher')!;
    const parentRole      = roleMap.get('parent')!;

    const now = new Date();

    type MemberSpec = {
      user: User;
      school: School;
      defaultBranch: SchoolBranch;
      role: Role;
      isDefault: boolean;
    };

    const specs: MemberSpec[] = [
      // Super admin — member of BOTH schools
      { user: users.superAdmin, school: schools.kigali, defaultBranch: branches.kigali, role: superAdminRole,  isDefault: true  },
      { user: users.superAdmin, school: schools.huye,   defaultBranch: branches.huye, role: superAdminRole,  isDefault: false },
      // School admin — Kigali only
      { user: users.schoolAdmin, school: schools.kigali, defaultBranch: branches.kigali, role: schoolAdminRole, isDefault: true },
      // Teacher — Kigali only
      { user: users.teacher,    school: schools.kigali, defaultBranch: branches.kigali, role: teacherRole,     isDefault: true },
      // Parents — Kigali only
      { user: users.parent1,    school: schools.kigali, defaultBranch: branches.kigali, role: parentRole,      isDefault: true },
      { user: users.parent2,    school: schools.kigali, defaultBranch: branches.kigali, role: parentRole,      isDefault: true },
    ];

    for (const spec of specs) {
      const member = this.memberRepo.create({
        member:     spec.user,
        school:     spec.school,
        defaultBranch: spec.defaultBranch,
        status:     ESchoolMemberStatus.ACTIVE,
        isDefault:  spec.isDefault,
        acceptedAt: now,
      });
      const savedMember = await this.memberRepo.save(member);

      const memberRole = this.memberRoleRepo.create({
        schoolMember: savedMember,
        role: spec.role,
      });
      await this.memberRoleRepo.save(memberRole);
    }

    this.logger.log('     → 6 school memberships + role assignments created.');
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Step 7 — Staff profile (teacher)
  // ═══════════════════════════════════════════════════════════════════════

  private async seedStaffProfile(
    teacher: User,
    school: School,
    branch: SchoolBranch,
  ): Promise<Staff> {
    this.logger.log('  [7/12] Seeding staff profile…');

    const staff = this.staffRepo.create({
      user:     teacher,
      position: 'Lead Teacher',
      school,
    });
    const saved = await this.staffRepo.save(staff);
    await this.staffBranchRepo.save(
      this.staffBranchRepo.create({
        staff: saved,
        branch,
        isPrimary: true,
      }),
    );
    this.logger.log('     → 1 staff profile created.');
    return saved;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Step 8 — Parent profiles
  // ═══════════════════════════════════════════════════════════════════════

  private async seedParentProfiles(
    users: { parent1: User; parent2: User },
    school: School,
  ): Promise<{ parent1: Parent; parent2: Parent }> {
    this.logger.log('  [8/12] Seeding parent profiles…');

    const [parent1, parent2] = await this.parentRepo.save([
      this.parentRepo.create({
        user:        users.parent1,
        occupation:  'Nurse',
        phoneNumber: '+250788111001',
        address:     'Kigali, Nyarugenge',
        school,
      }),
      this.parentRepo.create({
        user:        users.parent2,
        occupation:  'Engineer',
        phoneNumber: '+250788111002',
        address:     'Kigali, Kicukiro',
        school,
      }),
    ]);

    this.logger.log('     → 2 parent profiles created.');
    return { parent1, parent2 };
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Step 9 — Classroom
  // ═══════════════════════════════════════════════════════════════════════

  private async seedClassroom(
    branch: SchoolBranch,
    createdBy: User,
  ): Promise<Classroom> {
    this.logger.log('  [9/12] Seeding classroom…');

    const classroom = this.classroomRepo.create({
      name:      'Nursery A',
      ageGroup:  '2–3 years',
      capacity:  20,
      branch,
      createdBy,
    });
    const saved = await this.classroomRepo.save(classroom);
    this.logger.log('     → Classroom "Nursery A" created.');
    return saved;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Step 10 — Students
  // ═══════════════════════════════════════════════════════════════════════

  private async seedStudents(
    branch: SchoolBranch,
    classroom: Classroom,
  ): Promise<{ alice: Student; bob: Student }> {
    this.logger.log('  [10/12] Seeding students…');

    const [alice, bob] = await this.studentRepo.save([
      this.studentRepo.create({
        fullName:    'Alice Uwimana',
        dateOfBirth: new Date('2021-03-15'),
        gender:      'Female',
        branch,
        classroom,
        notes:       'No known allergies.',
      }),
      this.studentRepo.create({
        fullName:    'Bob Nkurunziza',
        dateOfBirth: new Date('2020-11-22'),
        gender:      'Male',
        branch,
        classroom,
        notes:       'Mild peanut allergy — EpiPen in the office.',
      }),
    ]);

    this.logger.log('     → 2 students created.');
    return { alice, bob };
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Step 11 — StudentGuardian links
  // ═══════════════════════════════════════════════════════════════════════

  private async seedGuardianLinks(
    students: { alice: Student; bob: Student },
    parents:  { parent1: Parent; parent2: Parent },
  ): Promise<void> {
    this.logger.log('  [11/12] Seeding guardian links…');

    await this.guardianRepo.save([
      this.guardianRepo.create({
        student:          students.alice,
        parent:           parents.parent1,
        relationship:     EGuardianRelationship.MOTHER,
        canPickup:        true,
        isEmergencyContact: true,
      }),
      this.guardianRepo.create({
        student:          students.bob,
        parent:           parents.parent2,
        relationship:     EGuardianRelationship.FATHER,
        canPickup:        true,
        isEmergencyContact: true,
      }),
    ]);

    this.logger.log('     → 2 guardian links created.');
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  Credential summary (printed after seed completes)
  // ═══════════════════════════════════════════════════════════════════════

  private printCredentials(): void {
    const pad = (s: string) => s.padEnd(34);
    console.log('┌─────────────────────────────────────────────────────────────┐');
    console.log('│                  SEED CREDENTIALS                          │');
    console.log('│  All accounts use password:  ' + SEED_PASSWORD_PLAIN.padEnd(32) + '│');
    console.log('├─────────────────────────────────────────────────────────────┤');
    console.log(`│  ${pad('super@kindora.rw')}  SUPER_ADMIN  (both schools) │`);
    console.log(`│  ${pad('admin.kgl@kindora.rw')}  SCHOOL_ADMIN (Kigali)       │`);
    console.log(`│  ${pad('teacher.kgl@kindora.rw')}  TEACHER      (Kigali)       │`);
    console.log(`│  ${pad('parent1.kgl@kindora.rw')}  PARENT        (Alice's mum)  │`);
    console.log(`│  ${pad('parent2.kgl@kindora.rw')}  PARENT        (Bob's dad)    │`);
    console.log('└─────────────────────────────────────────────────────────────┘');
  }
}
