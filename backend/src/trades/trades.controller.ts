import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { TradesService } from './trades.service';
import { CreateTradeDto } from './dtos/create-trade.dto';
import { UpdateTradeDto } from './dtos/update-trade.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { Request } from 'express';
import { PreTradeCheckDto } from './dtos/pre-trade-check.dto';

interface AuthenticatedRequest extends Request {
    user: {
        sub: string;
    }
}

@UseGuards(JwtAccessGuard)
@Controller('trades')
export class TradesController {
  constructor(private readonly tradesService: TradesService) {}

  @Post()
  create(@Body() createTradeDto: CreateTradeDto, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.tradesService.create(userId, createTradeDto);
  }

  @Get()
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query('brokerAccountId') brokerAccountId: string
  ) {
    const userId = req.user.sub;
    return this.tradesService.findAllByAccount(userId, brokerAccountId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateTradeDto: UpdateTradeDto, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.tradesService.update(id, userId, updateTradeDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.tradesService.remove(id, userId);
  }

  @Post(':id/analyze')
  @HttpCode(HttpStatus.OK)
  analyze(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.tradesService.analyze(id, userId);
  }

  @Post('pre-trade-check')
  @HttpCode(HttpStatus.OK)
  preTradeCheck(@Body() preTradeCheckDto: PreTradeCheckDto, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.tradesService.preTradeCheck(userId, preTradeCheckDto);
  }
}