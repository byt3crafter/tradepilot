import { HttpAdapterHost, NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import * as express from 'express';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { PrismaExceptionFilter } from './common/filters/prisma-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const port = configService.get<number>('PORT', 8080);
  const frontendUrls = configService.get<string>('FRONTEND_URL');
  const nodeEnv = configService.get<string>('NODE_ENV');

  // Conditionally set the global prefix. In production, Nginx handles
  // the '/api' path and strips it, so the app should not have a prefix.
  // In development, we need the prefix for direct API calls.
  if (nodeEnv !== 'production') {
    app.setGlobalPrefix('api');
  }

  // Increase payload size limit for JSON and URL-encoded requests
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Security Middleware
  app.use(
    helmet({
      crossOriginOpenerPolicy: false,
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: false,
    }),
  );
  app.use(compression());

  // ──────────────────────────────────────────────────────────────────
  // CORS Configuration
  // ──────────────────────────────────────────────────────────────────
  const allowedOrigins = frontendUrls!.split(',').map(url => url.trim()).filter(Boolean);

  if (allowedOrigins.length > 0) {
    Logger.log(`CORS allowed origins: [${allowedOrigins.join(', ')}]`, 'Bootstrap');
    app.enableCors({
      origin: allowedOrigins,
      credentials: true,
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      allowedHeaders: 'Content-Type, Accept, Authorization',
    });
  } else {
    Logger.warn(`CORS is not configured with any origins.`, 'Bootstrap');
  }


  // Global Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
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