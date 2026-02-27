/**
 * seed-all.ts — Kindora comprehensive seed entry point.
 *
 * Bootstraps a minimal NestJS application context (no HTTP server, no Redis,
 * no mail) and runs KindoraSeederService.seed().
 *
 * Usage:
 *   npm run seed:all          ← seed only (DB must exist + uuid-ossp installed)
 *   npm run db:fresh          ← db:reset + seed:all in one command (recommended)
 */
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { KindoraSeederModule } from './kindora-seeder.module';
import { KindoraSeederService } from './kindora-seeder.service';

async function bootstrap(): Promise<void> {
  const logger = new Logger('SeedAll');

  const app = await NestFactory.createApplicationContext(KindoraSeederModule, {
    logger: ['log', 'error', 'warn'],
  });

  try {
    const seeder = app.get(KindoraSeederService);
    await seeder.seed();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Seed failed: ${message}`);
    if (err instanceof Error) logger.error(err.stack);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();
