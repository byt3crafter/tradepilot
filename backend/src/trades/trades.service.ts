import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTradeDto } from './dtos/create-trade.dto';
import { UpdateTradeDto } from './dtos/update-trade.dto';
import { AiService } from '../ai/ai.service';

@Injectable()
export class TradesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
  ) {}

  async create(userId: string, createTradeDto: CreateTradeDto) {
    const { brokerAccountId, strategyId } = createTradeDto;
    
    // Verify that the associated account and strategy belong to the user
    const brokerAccount = await (this.prisma as any).brokerAccount.findFirst({
        where: { id: brokerAccountId, userId }
    });
    if (!brokerAccount) {
        throw new BadRequestException('Broker account not found or does not belong to the user.');
    }

    const strategy = await (this.prisma as any).strategy.findFirst({
        where: { id: strategyId, userId }
    });
    if (!strategy) {
        throw new BadRequestException('Strategy not found or does not belong to the user.');
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
      },
      orderBy: { tradeDate: 'desc' },
    });
  }

  async findOne(id: string, userId: string, includeAnalysis = false) {
    const trade = await (this.prisma as any).trade.findUnique({
      where: { id },
      include: { 
        aiAnalysis: includeAnalysis,
        strategy: true
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
    const trade = await this.findOne(tradeId, userId);

    if (!trade.screenshotBeforeUrl || !trade.screenshotAfterUrl) {
      throw new BadRequestException('Both "Before" and "After" screenshots are required for analysis.');
    }
    
    if (!trade.strategy) {
      throw new BadRequestException('Trade strategy is missing.');
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

    const analysisResult = await this.aiService.getTradeAnalysis(trade, trade.strategy, pastMistakes);

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