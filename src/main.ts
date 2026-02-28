/* eslint-disable @typescript-eslint/no-floating-promises */
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { TrimBodyPipe } from './common/pipes';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { ResponseInterceptor } from './common/interceptors';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    snapshot: true,
  });

  // ── Security headers ────────────────────────────────────────────────────────
  // Sets CSP, X-Frame-Options (clickjacking), HSTS, X-Content-Type-Options,
  // Referrer-Policy, and more.  Must be registered before any routes.
  app.use(helmet());

  app.setGlobalPrefix('api');

  // ── CORS ────────────────────────────────────────────────────────────────────
  // Restrict to explicitly listed origins.  Set a comma-separated list in .env:
  //   ALLOWED_ORIGINS=https://app.kindora.com,https://admin.kindora.com
  // If ALLOWED_ORIGINS is empty the server rejects all cross-origin requests.
  const rawOrigins = process.env.ALLOWED_ORIGINS ?? '';
  const allowedOrigins = rawOrigins
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : false,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-School-Id',
      'X-Branch-Id',
      'X-Reauth-Token',
    ],
    credentials: true,
  });

  // ── Validation & serialisation ──────────────────────────────────────────────
  app.useGlobalPipes(
    new TrimBodyPipe(),
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(new Reflector()),
    new ResponseInterceptor(new Reflector()),
  );

  // ── Swagger ─────────────────────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('Kindora API')
    .setDescription('Kindora API documentation')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/swagger', app, document);

  await app.listen(process.env.SERVER_PORT ?? 3076);
}
bootstrap();
