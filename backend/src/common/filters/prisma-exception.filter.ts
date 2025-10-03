
import { ArgumentsHost, Catch, HttpStatus } from '@nestjs/common';
import { AbstractHttpAdapter, BaseExceptionFilter } from '@nestjs/core';
// FIX: Use namespace import for Prisma types to resolve module export errors.
import * as pc from '@prisma/client';
import { Response } from 'express';


@Catch(pc.Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter extends BaseExceptionFilter {
  constructor(applicationRef?: AbstractHttpAdapter) {
    super(applicationRef);
  }

  catch(exception: pc.Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
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

    // FIX: Cast response to any to resolve issue with status method typing.
    (response as any).status(status).json({
      success: false,
      error: {
        code: `PRISMA_${exception.code}`,
        message,
        details,
      },
    });
  }
}