import { Controller, Get, Query, Res, UseGuards, Req, HttpStatus, HttpException } from '@nestjs/common';
import { Response } from 'express';
import { PdfService } from './pdf.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
  };
}

@UseGuards(JwtAccessGuard)
@Controller('pdf')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  @Get('compliance-report')
  async generateComplianceReport(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
    @Query('accountId') accountId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('includeScreenshots') includeScreenshots?: string,
    @Query('includeJournal') includeJournal?: string,
    @Query('includeAiNotes') includeAiNotes?: string,
  ) {
    if (!accountId) {
      throw new HttpException('accountId is required', HttpStatus.BAD_REQUEST);
    }

    const userId = (req as any).user.sub;

    try {
      const pdfBuffer = await this.pdfService.generateComplianceReport({
        accountId,
        userId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        includeScreenshots: includeScreenshots === 'true',
        includeJournal: includeJournal === 'true',
        includeAiNotes: includeAiNotes === 'true',
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=compliance-report-${accountId}-${Date.now()}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      throw new HttpException(error.message || 'Failed to generate PDF', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
