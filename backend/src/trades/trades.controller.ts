import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { TradesService } from './trades.service';
import { CreateTradeDto } from './dtos/create-trade.dto';
import { UpdateTradeDto } from './dtos/update-trade.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { Request } from 'express';
import { BulkImportTradesDto } from './dtos/bulk-import-trades.dto';
import { BulkDeleteTradesDto } from './dtos/bulk-delete-trades.dto';

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

  @Post('bulk-import')
  @HttpCode(HttpStatus.OK)
  bulkImport(@Body() bulkImportDto: BulkImportTradesDto, @Req() req: AuthenticatedRequest) {
    const userId = req.user.sub;
    return this.tradesService.bulkImport(userId, bulkImportDto);
  }

  @Post('bulk-delete')
  @HttpCode(HttpStatus.OK)
  bulkRemove(@Body() bulkDeleteDto: BulkDeleteTradesDto, @Req() req: AuthenticatedRequest) {
      const userId = req.user.sub;
      return this.tradesService.bulkRemove(userId, bulkDeleteDto.tradeIds);
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
}
