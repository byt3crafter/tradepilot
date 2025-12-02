import { Controller, Post, Body, Patch, Param, UseGuards, Req } from '@nestjs/common';
import { TradeJournalsService } from './trade-journals.service';
import { CreateTradeJournalDto } from './dto/create-trade-journal.dto';
import { UpdateTradeJournalDto } from './dto/update-trade-journal.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
    user: {
        sub: string;
    }
}

@UseGuards(JwtAccessGuard)
@Controller()
export class TradeJournalsController {
  constructor(private readonly tradeJournalsService: TradeJournalsService) {}

  @Post('trades/:tradeId/journal')
  create(
    @Param('tradeId') tradeId: string, 
    @Body() createTradeJournalDto: CreateTradeJournalDto,
    @Req() req: AuthenticatedRequest
  ) {
    const userId = req.user.sub;
    return this.tradeJournalsService.create(userId, tradeId, createTradeJournalDto);
  }

  @Patch('trade-journals/:journalId')
  update(
    @Param('journalId') journalId: string, 
    @Body() updateTradeJournalDto: UpdateTradeJournalDto,
    @Req() req: AuthenticatedRequest
  ) {
    const userId = req.user.sub;
    return this.tradeJournalsService.update(userId, journalId, updateTradeJournalDto);
  }
}
