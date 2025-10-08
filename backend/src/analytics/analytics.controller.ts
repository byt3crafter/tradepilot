import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { Request } from 'express';
import { AnalyticsQueryDto } from './dtos/analytics-query.dto';

interface AuthenticatedRequest extends Request {
    user: {
        sub: string;
    }
}

@UseGuards(JwtAccessGuard)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get(':accountId')
  getAnalytics(
    @Param('accountId') accountId: string,
    @Req() req: AuthenticatedRequest,
    @Query() query: AnalyticsQueryDto,
  ) {
    const userId = req.user.sub;
    return this.analyticsService.getAnalytics(userId, accountId, query.startDate, query.endDate);
  }
}
