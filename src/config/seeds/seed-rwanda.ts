import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { RwandaLocationSeederModule } from './rwanda-location-seeder.module';
import { RwandaLocationSeederService } from './rwanda-location-seeder.service';

async function bootstrap(): Promise<void> {
  const logger = new Logger('SeedRwanda');

  const app = await NestFactory.createApplicationContext(
    RwandaLocationSeederModule,
    {
      logger: ['log', 'error', 'warn'],
    },
  );

  try {
    const seeder = app.get(RwandaLocationSeederService);
    await seeder.seed();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Rwanda seed failed: ${message}`);
    if (err instanceof Error) logger.error(err.stack);
    process.exitCode = 1;
  } finally {
    await app.close();
  }
}

bootstrap();

