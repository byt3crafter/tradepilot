

import { ArgumentsHost, Catch, HttpStatus } from '@nestjs/common';
import { AbstractHttpAdapter, BaseExceptionFilter } from '@nestjs/core';
// FIX: The import from '@prisma/client' fails when `prisma generate` has not been run.
// import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch()
export class PrismaExceptionFilter extends BaseExceptionFilter {
  constructor(applicationRef?: AbstractHttpAdapter) {
    super(applicationRef);
  }

  catch(exception: any, host: ArgumentsHost) {
    // FIX: Check for Prisma error shape instead of type due to import issues.
    if (exception?.code && typeof exception.code === 'string' && exception.code.startsWith('P')) {
      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();

      let status = HttpStatus.INTERNAL_SERVER_ERROR;
      let message = 'An unexpected error occurred';
      let details: any = {};

      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = 'A record with this value already exists.';
          details = {
            fields: exception.meta?.target,
          };
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'The requested record was not found.';
          break;
        // Add other Prisma error codes as needed
        default:
          // For other errors, you might want to fall back to the default handler
          super.catch(exception, host);
          return;
      }

      // FIX: Cast response to 'any' to resolve status method typing issue.
      (response as any).status(status).json({
        success: false,
        error: {
          code: `PRISMA_${exception.code}`,
          message,
          details,
        },
      });
    } else {
      // If it's not a Prisma error, delegate to the default NestJS exception filter.
      super.catch(exception, host);
    }
  }
}