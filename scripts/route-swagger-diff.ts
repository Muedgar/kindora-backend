import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ModulesContainer } from '@nestjs/core';
import { AppModule } from 'src/app.module';
import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

function toArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x));
  if (v === undefined || v === null) return [''];
  return [String(v)];
}

function joinPaths(...parts: string[]): string {
  const cleaned = parts
    .map((p) => String(p ?? '').trim())
    .filter((p) => p.length > 0)
    .map((p) => p.replace(/^\/+|\/+$/g, ''));
  const joined = cleaned.join('/');
  return '/' + joined;
}

function normalize(path: string): string {
  let p = path.trim();
  if (!p.startsWith('/')) p = '/' + p;
  p = p.replace(/\/+/g, '/');
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p;
}

function stripApiPrefix(path: string): string {
  const p = normalize(path);
  if (p === '/api') return '/';
  if (p.startsWith('/api/')) return p.slice(4);
  return p;
}

function methodToLower(m: RequestMethod): string {
  switch (m) {
    case RequestMethod.GET: return 'get';
    case RequestMethod.POST: return 'post';
    case RequestMethod.PUT: return 'put';
    case RequestMethod.DELETE: return 'delete';
    case RequestMethod.PATCH: return 'patch';
    case RequestMethod.ALL: return 'all';
    case RequestMethod.OPTIONS: return 'options';
    case RequestMethod.HEAD: return 'head';
    default: return 'unknown';
  }
}

async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Kindora API')
    .setDescription('Kindora API documentation')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();
  const swaggerDoc = SwaggerModule.createDocument(app, swaggerConfig);

  const swaggerOps = new Set<string>();
  for (const [path, methods] of Object.entries(swaggerDoc.paths ?? {})) {
    const nPath = stripApiPrefix(path);
    for (const method of Object.keys(methods ?? {})) {
      swaggerOps.add(`${method.toLowerCase()} ${normalize(nPath)}`);
    }
  }

  const modulesContainer = app.get(ModulesContainer);
  const runtimeOps = new Set<string>();

  for (const moduleRef of modulesContainer.values()) {
    for (const ctrlWrapper of moduleRef.controllers.values()) {
      const ctrl = ctrlWrapper.metatype;
      if (!ctrl) continue;

      const ctrlPaths = toArray(Reflect.getMetadata(PATH_METADATA, ctrl));
      const proto = ctrl.prototype;
      if (!proto) continue;

      for (const key of Object.getOwnPropertyNames(proto)) {
        if (key === 'constructor') continue;
        const handler = proto[key];
        if (typeof handler !== 'function') continue;

        const reqMethod = Reflect.getMetadata(METHOD_METADATA, handler) as RequestMethod | undefined;
        if (reqMethod === undefined) continue;

        const methodPaths = toArray(Reflect.getMetadata(PATH_METADATA, handler));
        for (const cPath of ctrlPaths) {
          for (const mPath of methodPaths) {
            const full = normalize(joinPaths('api', cPath, mPath));
            const stripped = stripApiPrefix(full);
            runtimeOps.add(`${methodToLower(reqMethod)} ${normalize(stripped)}`);
          }
        }
      }
    }
  }

  const missingInSwagger = [...runtimeOps].filter((op) => !swaggerOps.has(op)).sort();
  const extraInSwagger = [...swaggerOps].filter((op) => !runtimeOps.has(op)).sort();

  console.log(JSON.stringify({
    runtimeRouteCount: runtimeOps.size,
    swaggerRouteCount: swaggerOps.size,
    missingInSwagger,
    extraInSwagger,
  }, null, 2));

  await app.close();
}

main().catch(async (err) => {
  console.error(err);
  process.exit(1);
});
