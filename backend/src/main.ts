import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import * as express from 'express';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const port = configService.get<number>('PORT', 8080);
  const frontendUrls = configService.get<string>('FRONTEND_URL') ?? '';
  const nodeEnv = configService.get<string>('NODE_ENV') ?? 'development';

  // Increase payload size limit for JSON and URL-encoded requests
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Security Middleware
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  // ────────────────────────────────────────────────────────────────
  // CORS (explicit allow-list; never throw -> avoid 500 on preflight)
  // ────────────────────────────────────────────────────────────────
  const allowedOrigins = frontendUrls
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no Origin (curl, mobile apps, SSR)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Not allowed: respond with CORS false (no exception -> no 500)
      if (nodeEnv !== 'production') {
        Logger.warn(
          `CORS blocked Origin: ${origin}. Allowed: ${JSON.stringify(
            allowedOrigins,
          )}`,
          'CORS',
        );
      }
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Disposition'],
  });

  // Global Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global Filters
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new PrismaExceptionFilter(httpAdapterHost.httpAdapter));

  // Global Interceptors
  app.useGlobalInterceptors(new ResponseInterceptor());

  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port} in ${nodeEnv} mode`,
    'Bootstrap',
  );
}
bootstrap();
