import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTradeDto } from './dtos/create-trade.dto';
import { UpdateTradeDto } from './dtos/update-trade.dto';
import { AiService } from '../ai/ai.service';
import { BrokerAccountsService } from '../broker-accounts/broker-accounts.service';

@Injectable()
export class TradesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly accountsService: BrokerAccountsService,
  ) {}

  async create(userId: string, createTradeDto: CreateTradeDto) {
    const { brokerAccountId, playbookId, riskPercentage } = createTradeDto;
    
    const brokerAccount = await (this.prisma as any).brokerAccount.findFirst({
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

    const playbook = await (this.prisma as any).playbook.findFirst({
        where: { id: playbookId, userId }
    });
    if (!playbook) {
        throw new BadRequestException('Playbook not found or does not belong to the user.');
    }

    return (this.prisma as any).trade.create({
      data: {
        ...createTradeDto,
        userId,
      },
    });
  }

  async findAllByAccount(userId: string, brokerAccountId: string) {
    return (this.prisma as any).trade.findMany({
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
    const trade = await (this.prisma as any).trade.findUnique({
      where: { id },
      include: { 
        aiAnalysis: includeRelations,
        tradeJournal: includeRelations,
        playbook: includeRelations,
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

    return (this.prisma as any).trade.update({
      where: { id },
      data: updateTradeDto,
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId); // Authorization check
    
    await (this.prisma as any).trade.delete({
      where: { id },
    });
    
    return { message: 'Trade deleted successfully.' };
  }

  async analyze(tradeId: string, userId: string) {
    const trade = await this.findOne(tradeId, userId, true);

    if (!trade.screenshotBeforeUrl || !trade.screenshotAfterUrl) {
      throw new BadRequestException('Both "Before" and "After" screenshots are required for analysis.');
    }
    
    if (!trade.playbook) {
      throw new BadRequestException('Trade playbook is missing.');
    }
    
    // Contextual Learning: Find past mistakes from other analyzed trades
    const pastTrades = await (this.prisma as any).trade.findMany({
      where: {
        userId,
        aiAnalysis: { isNot: null },
      },
      include: { aiAnalysis: true },
    });
    
    const pastMistakes = pastTrades
        .filter((t: { aiAnalysis: { mistakes: unknown[] } | null }) => t.aiAnalysis && t.aiAnalysis.mistakes.length > 0)
        .flatMap((t: { aiAnalysis: { mistakes: { mistake: string }[] } }) => t.aiAnalysis.mistakes.map((m: { mistake: string }) => m.mistake))
        .join(', ');

    const analysisResult = await this.aiService.getTradeAnalysis(trade, trade.playbook, pastMistakes);

    // Save the analysis to the database
    const updatedTrade = await (this.prisma as any).trade.update({
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
      include: { aiAnalysis: true },
    });

    return updatedTrade;
  }
}