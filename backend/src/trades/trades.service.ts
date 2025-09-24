
import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTradeDto } from './dtos/create-trade.dto';
import { UpdateTradeDto } from './dtos/update-trade.dto';
import { AiService } from '../ai/ai.service';
import { BrokerAccountsService } from '../broker-accounts/broker-accounts.service';
// FIX: The import from '@prisma/client' fails when `prisma generate` has not been run.
// import { TradeResult, Trade, AiAnalysis } from '@prisma/client';

// FIX: Define local types to satisfy TypeScript during compile time.
export enum TradeResult {
  Win = 'Win',
  Loss = 'Loss',
  Breakeven = 'Breakeven',
}
type Trade = any;
type AiAnalysis = any;

@Injectable()
export class TradesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly accountsService: BrokerAccountsService,
  ) {}

  async create(userId: string, createTradeDto: CreateTradeDto) {
    const { brokerAccountId, playbookId, riskPercentage } = createTradeDto;
    
    const brokerAccount = await this.prisma.brokerAccount.findFirst({
        where: { id: brokerAccountId, userId },
        include: { smartLimits: true }
    });
    if (!brokerAccount) {
        throw new BadRequestException('Broker account not found or does not belong to the user.');
    }

    // --- Smart Limits Enforcement ---
    if (brokerAccount.smartLimits?.isEnabled) {
      const { maxRiskPerTrade } = brokerAccount.smartLimits;
      if (maxRiskPerTrade && riskPercentage > maxRiskPerTrade) {
        throw new ForbiddenException(`Trade risk of ${riskPercentage}% exceeds your Smart Limit of ${maxRiskPerTrade}%.`);
      }
      
      const progress = await this.accountsService.getSmartLimitsProgress(brokerAccountId, userId);
      if (progress.isTradeCreationBlocked) {
        throw new ForbiddenException(progress.blockReason);
      }
    }
    // --- End of Enforcement ---

    const playbook = await this.prisma.playbook.findFirst({
        where: { id: playbookId, userId }
    });
    if (!playbook) {
        throw new BadRequestException('Playbook not found or does not belong to the user.');
    }

    return this.prisma.trade.create({
      data: {
        ...createTradeDto,
        userId,
      },
    });
  }

  async findAllByAccount(userId: string, brokerAccountId: string) {
    return this.prisma.trade.findMany({
      where: { 
        userId,
        brokerAccountId 
      },
      include: {
        aiAnalysis: true, // Include the analysis data when fetching trades
        tradeJournal: true, // Include the journal data
      },
      orderBy: { entryDate: 'desc' },
    });
  }

  async findOne(id: string, userId: string, includeRelations = false) {
    const trade = await this.prisma.trade.findUnique({
      where: { id },
      include: { 
        aiAnalysis: includeRelations,
        tradeJournal: includeRelations,
      },
    });

    if (!trade) {
      throw new NotFoundException(`Trade with ID ${id} not found.`);
    }

    if (trade.userId !== userId) {
      throw new ForbiddenException('You are not authorized to access this trade.');
    }

    return trade;
  }

  async update(id: string, userId: string, updateTradeDto: UpdateTradeDto) {
    await this.findOne(id, userId); // Authorization check

    let dataToUpdate: Partial<UpdateTradeDto> = { ...updateTradeDto };

    // If P/L is provided, determine the trade result automatically
    if (updateTradeDto.profitLoss !== undefined && updateTradeDto.profitLoss !== null) {
      let result: TradeResult;
      if (Math.abs(updateTradeDto.profitLoss) < 0.01) {
          result = TradeResult.Breakeven;
      } else if (updateTradeDto.profitLoss > 0) {
          result = TradeResult.Win;
      } else {
          result = TradeResult.Loss;
      }
      dataToUpdate.result = result;
    }

    return this.prisma.trade.update({
      where: { id },
      data: dataToUpdate,
      include: {
          aiAnalysis: true,
          tradeJournal: true,
      }
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId); // Authorization check
    
    await this.prisma.trade.delete({
      where: { id },
    });
    
    return { message: 'Trade deleted successfully.' };
  }

  async analyze(tradeId: string, userId: string) {
    const trade = await this.findOne(tradeId, userId, true);
    
    const playbook = await this.prisma.playbook.findUnique({ where: { id: trade.playbookId }});

    if (!trade.screenshotBeforeUrl || !trade.screenshotAfterUrl) {
      throw new BadRequestException('Both "Before" and "After" screenshots are required for analysis.');
    }
    
    if (!playbook) {
      throw new BadRequestException('Trade playbook is missing.');
    }
    
    const pastTrades = await this.prisma.trade.findMany({
      where: {
        userId,
        aiAnalysis: { isNot: null },
      },
      select: { aiAnalysis: true },
    });
    
    const pastMistakes = pastTrades
        .filter((t: { aiAnalysis: AiAnalysis | null }) => t.aiAnalysis && (t.aiAnalysis.mistakes as any[]).length > 0)
        .flatMap((t: { aiAnalysis: AiAnalysis | null }) => (t.aiAnalysis!.mistakes as any[]).map(m => m.mistake))
        .join(', ');

    const analysisResult = await this.aiService.getTradeAnalysis(trade, playbook, pastMistakes);

    const updatedTrade = await this.prisma.trade.update({
      where: { id: tradeId },
      data: {
        aiAnalysis: {
          upsert: {
            create: {
              summary: analysisResult.summary,
              mistakes: analysisResult.mistakes,
              goodPoints: analysisResult.goodPoints,
            },
            update: {
              summary: analysisResult.summary,
              mistakes: analysisResult.mistakes,
              goodPoints: analysisResult.goodPoints,
            },
          },
        },
      },
      include: { aiAnalysis: true, tradeJournal: true },
    });

    return updatedTrade;
  }
}