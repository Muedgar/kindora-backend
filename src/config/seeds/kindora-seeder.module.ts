/**
 * KindoraSeederModule
 *
 * A standalone NestJS module used exclusively by the seed-all.ts script.
 * Key differences from the production AppModule:
 *
 *  • synchronize: false — schema must come from explicit migrations.
 *  • All entity classes are imported directly (no glob) so ts-node can resolve
 *    them without a compiled `dist/` folder.
 *  • No Redis, no mail, no guards — seed context only.
 */
import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { config as dotenvConfig } from 'dotenv';
import { DataSourceOptions } from 'typeorm';

// ── Core ──────────────────────────────────────────────────────────────────
import { Permission } from 'src/permissions/entities/permission.entity';
import { Role } from 'src/roles/roles.entity';
import { User } from 'src/users/entities/user.entity';

// ── Schools ───────────────────────────────────────────────────────────────
import { School } from 'src/schools/entities/school.entity';
import { SchoolMember } from 'src/schools/entities/school-member.entity';
import { SchoolMemberRole } from 'src/schools/entities/school-member-role.entity';
import { SchoolBranch } from 'src/schools/entities/rwanda/school-branch.entity';

// ── Rwanda Location Hierarchy ─────────────────────────────────────────────
import { Province } from 'src/location/rwanda/province/province.entity';
import { District } from 'src/location/rwanda/district/district.entity';
import { Sector } from 'src/location/rwanda/sector/sector.entity';
import { Cell } from 'src/location/rwanda/cell/cell.entity';
import { Village } from 'src/location/rwanda/village/village.entity';

// ── Classroom & Students ──────────────────────────────────────────────────
import { Classroom } from 'src/classrooms/entities/classroom.entity';
import { Student } from 'src/students/entities/student.entity';
import { StudentGuardian } from 'src/students/entities/student-guardian.entity';

// ── Profiles ──────────────────────────────────────────────────────────────
import { Parent } from 'src/parents/entities/parent.entity';
import { Staff } from 'src/staffs/entities/staff.entity';
import { StaffBranch } from 'src/staffs/entities/staff-branch.entity';

// ── Reports (schema only — not seeded) ────────────────────────────────────
import { Category } from 'src/reports/entities/category.entity';
import { Activity } from 'src/reports/entities/activity.entity';
import { ActivitiesTemplate } from 'src/reports/entities/activity-template.entity';
import { GradingLevel } from 'src/reports/entities/grading-level.entity';
import { DailyReport } from 'src/reports/entities/daily-report.entity';

// ── Seeder Service ────────────────────────────────────────────────────────
import { KindoraSeederService } from './kindora-seeder.service';

dotenvConfig({ path: '.env' });

const ALL_ENTITIES = [
  // Core RBAC
  Permission,
  Role,
  User,
  // Schools
  School,
  SchoolMember,
  SchoolMemberRole,
  SchoolBranch,
  // Location
  Province,
  District,
  Sector,
  Cell,
  Village,
  // Academic
  Classroom,
  Student,
  StudentGuardian,
  // Profiles
  Parent,
  Staff,
  StaffBranch,
  // Reports (schema only)
  Category,
  Activity,
  ActivitiesTemplate,
  GradingLevel,
  DailyReport,
];

const dbOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD ?? '',
  database: process.env.POSTGRES_DB,
  entities: ALL_ENTITIES,
  synchronize: false,
  logging: false,
};

@Module({
  imports: [
    TypeOrmModule.forRoot(dbOptions),
    TypeOrmModule.forFeature(ALL_ENTITIES),
  ],
  providers: [Logger, KindoraSeederService],
})
export class KindoraSeederModule {}
