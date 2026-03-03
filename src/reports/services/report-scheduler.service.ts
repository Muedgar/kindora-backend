import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { School } from 'src/schools/entities/school.entity';
import { User } from 'src/users/entities';
import { ReportSnapshotService } from './report-snapshot.service';
import { EReportType } from '../enums/snapshot.enum';

/**
 * ReportSchedulerService — Phase 3.
 *
 * Runs background jobs that auto-generate weekly report snapshots.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  Weekly job (every Monday at 06:00 UTC)                         │
 * │                                                                 │
 * │  For every school in the database:                              │
 * │    • Compute the previous week's Monday → Sunday dates.         │
 * │    • Call generateBulk to produce a DRAFT snapshot for every    │
 * │      student that had ≥1 observation in that window.            │
 * │    • Students with zero observations still get an empty DRAFT   │
 * │      (totalObservations = 0) so teachers notice the gap.        │
 * │                                                                 │
 * │  Teachers then review DRAFT → PENDING_REVIEW → PUBLISHED.       │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * Design choices:
 *   • Uses DataSource directly to load all schools — avoids importing
 *     SchoolsModule into ReportsModule circularly.
 *   • The "system user" for scheduled generation: we look up a user with
 *     the SYSTEM_USER_EMAIL env var (defaults to 'system@kindora.app').
 *     If not found, a minimal in-memory stub is used (no FK violation
 *     because created_by_id is NOT NULL — ensure the user exists in prod).
 *   • Per-school errors are caught and logged — one failing school does
 *     not abort the rest.
 */
@Injectable()
export class ReportSchedulerService {
  private readonly logger = new Logger(ReportSchedulerService.name);

  constructor(
    private readonly snapshotService: ReportSnapshotService,
    private readonly dataSource: DataSource,
  ) {}

  // ── Scheduled jobs ────────────────────────────────────────────────────────

  /**
   * Weekly report generation — runs every Monday at 06:00 UTC.
   *
   * Generates DRAFT snapshots for the preceding Monday–Sunday window
   * for all students across all schools.
   */
  @Cron('0 6 * * 1', { name: 'weekly-report-generation' })
  async handleWeeklyReportGeneration(): Promise<void> {
    this.logger.log('Weekly report generation started');

    const { periodStart, periodEnd } = this.previousWeekDates();
    this.logger.log(`Generating weekly reports for ${periodStart} → ${periodEnd}`);

    await this.runForAllSchools(EReportType.WEEKLY, periodStart, periodEnd);

    this.logger.log('Weekly report generation complete');
  }

  // ── Manual trigger (callable by admin controller) ─────────────────────────

  /**
   * Manually trigger bulk generation for all schools.
   * Exposed so an admin can re-run generation without waiting for the cron.
   */
  async triggerBulkForAllSchools(
    type: EReportType,
    periodStart: string,
    periodEnd: string,
  ): Promise<{ schoolsProcessed: number; schoolsFailed: number }> {
    return this.runForAllSchools(type, periodStart, periodEnd);
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private async runForAllSchools(
    type: EReportType,
    periodStart: string,
    periodEnd: string,
  ): Promise<{ schoolsProcessed: number; schoolsFailed: number }> {
    const schools = await this.dataSource
      .getRepository(School)
      .find();

    const systemUser = await this.resolveSystemUser();
    let schoolsProcessed = 0;
    let schoolsFailed = 0;

    for (const school of schools) {
      try {
        const result = await this.snapshotService.generateBulk(
          { type, periodStart, periodEnd },
          school,
          systemUser,
        );

        this.logger.log(
          `School ${school.id}: generated=${result.generated} skipped=${result.skipped} failed=${result.failed}`,
        );
        schoolsProcessed++;
      } catch (err: unknown) {
        schoolsFailed++;
        this.logger.error(
          `Failed to generate reports for school ${school.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    }

    return { schoolsProcessed, schoolsFailed };
  }

  /**
   * Returns ISO date strings for the Monday–Sunday window of the previous week.
   * Always relative to the current UTC date so the cron result is deterministic
   * regardless of which day it's actually called.
   */
  private previousWeekDates(): { periodStart: string; periodEnd: string } {
    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 1 = Monday, …

    // Days since last Monday: if today is Monday (1), that's 7 days back.
    const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek; // current week's Monday offset
    const thisMonday = new Date(now);
    thisMonday.setUTCDate(now.getUTCDate() - daysToLastMonday);

    const lastMonday = new Date(thisMonday);
    lastMonday.setUTCDate(thisMonday.getUTCDate() - 7);

    const lastSunday = new Date(lastMonday);
    lastSunday.setUTCDate(lastMonday.getUTCDate() + 6);

    return {
      periodStart: this.toIsoDate(lastMonday),
      periodEnd: this.toIsoDate(lastSunday),
    };
  }

  private toIsoDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Resolve the system user used as createdBy for scheduled snapshots.
   * Falls back to a minimal stub if the env var isn't set or the user
   * doesn't exist — but migration seeds the user in production.
   */
  private async resolveSystemUser(): Promise<User> {
    const email =
      process.env.SYSTEM_USER_EMAIL ?? 'system@kindora.app';

    const user = await this.dataSource
      .getRepository(User)
      .findOne({ where: { email } });

    if (user) return user;

    // Stub — works in dev/test; production should always have the user seeded.
    this.logger.warn(
      `System user "${email}" not found. Using stub — ensure the user is seeded in production.`,
    );
    const stub = new User();
    stub.pkid = 0;
    stub.id = '00000000-0000-0000-0000-000000000000';
    return stub;
  }
}
