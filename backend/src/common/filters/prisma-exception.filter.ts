
import { ArgumentsHost, Catch, HttpStatus } from '@nestjs/common';
import { AbstractHttpAdapter, BaseExceptionFilter } from '@nestjs/core';
// import { Prisma } from '@prisma/client'; // FIX: Removed to fix type error.
import { Response } from 'express';

// FIX: Catching all errors and checking for prisma error structurally as Prisma types are unavailable.
@Catch()
export class PrismaExceptionFilter extends BaseExceptionFilter {
  constructor(applicationRef?: AbstractHttpAdapter) {
    super(applicationRef);
  }

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    // FIX: Check for Prisma error structurally since type is unavailable.
    if (exception && typeof exception.code === 'string' && exception.code.startsWith('P')) {
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

      // FIX: Cast response to any to resolve 'status' property does not exist error.
      (response as any).status(status).json({
        success: false,
        error: {
          code: `PRISMA_${exception.code}`,
          message,
          details,
        },
      });
    } else {
      super.catch(exception, host);
    }
  }
}
