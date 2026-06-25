import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { MarketDataService } from './market-data.service';
import { GetCandlesDto } from './dtos/get-candles.dto';

@UseGuards(JwtAccessGuard)
@Controller('market-data')
export class MarketDataController {
  constructor(private readonly marketData: MarketDataService) {}

  @Get('candles')
  candles(@Query() q: GetCandlesDto) {
    return this.marketData.getCandles(q.symbol, q.interval || '1h', q.start, q.end);
  }
}
