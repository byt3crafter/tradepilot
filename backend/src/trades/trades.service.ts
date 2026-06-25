import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTradeDto } from './dtos/create-trade.dto';
import { UpdateTradeDto } from './dtos/update-trade.dto';
import { BrokerAccountsService } from '../broker-accounts/broker-accounts.service';
import { TradeResult } from '@prisma/client';
import { BulkImportTradesDto } from './dtos/bulk-import-trades.dto';

@Injectable()
export class TradesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: BrokerAccountsService,
  ) { }

  async create(userId: string, createTradeDto: CreateTradeDto) {
    // Explicitly destructure entryDate to prevent it from being included in ...rest with an optional type,
    // which confuses TypeScript when we try to assign a definite Date value later.
    const { brokerAccountId, playbookId, playbookSetupId, riskPercentage, entryDate, status, ...rest } = createTradeDto;

    const brokerAccount = await this.prisma.brokerAccount.findFirst({
      where: { id: brokerAccountId, userId },
      include: { smartLimits: true }
    });
    if (!brokerAccount) {
      throw new BadRequestException('Broker account not found or does not belong to the user.');
    }

    const logger = new Logger(TradesService.name);

    // --- Smart Limits Enforcement ---
    if (brokerAccount.smartLimits?.isEnabled) {
      const { maxRiskPerTrade } = brokerAccount.smartLimits;

      // Check risk per trade limit — always a warning, never blocks trade creation
      if (maxRiskPerTrade && riskPercentage > maxRiskPerTrade) {
        logger.warn(`[SMART LIMIT] User ${userId} exceeded risk limit: ${riskPercentage}% > ${maxRiskPerTrade}%`);
      }

      const progress = await this.accountsService.getSmartLimitsProgress(brokerAccountId, userId);
      if (progress.isTradeCreationBlocked) {
        // Always a warning, never blocks trade creation
        logger.warn(`[SMART LIMIT] User ${userId} limit triggered but not blocking: ${progress.blockReason}`);
      }
    }
    // --- End of Enforcement ---

    const playbook = await this.prisma.playbook.findFirst({
      where: { id: playbookId, userId },
      include: { setups: true }
    });
    if (!playbook) {
      throw new BadRequestException('Playbook not found or does not belong to the user.');
    }

    if (playbookSetupId) {
      const setupExists = playbook.setups.some(s => s.id === playbookSetupId);
      if (!setupExists) {
        throw new BadRequestException('The selected setup does not belong to the specified playbook.');
      }
    }

    return this.prisma.trade.create({
      data: {
        ...rest,
        entryDate: entryDate ?? new Date(),
        riskPercentage,
        user: { connect: { id: userId } },
        brokerAccount: { connect: { id: brokerAccountId } },
        playbook: { connect: { id: playbookId } },
        ...(playbookSetupId ? { playbookSetup: { connect: { id: playbookSetupId } } } : {}),
      },
    });
  }

  async bulkImport(userId: string, bulkImportDto: BulkImportTradesDto) {
    const { brokerAccountId, playbookId, trades } = bulkImportDto;
    const logger = new Logger(TradesService.name);

    logger.log(`Starting bulk import for user ${userId} on account ${brokerAccountId}`);
    logger.log(`Playbook ID: ${playbookId}, Number of trades: ${trades.length}`);

    // Authorization checks
    try {
      await this.accountsService.findOne(brokerAccountId, userId);
    } catch (error) {
      logger.error(`Broker account not found: ${brokerAccountId}`, error);
      throw new ForbiddenException('Broker account not found or does not belong to user.');
    }

    const playbook = await this.prisma.playbook.findFirst({ where: { id: playbookId, userId } });
    if (!playbook) {
      logger.error(`Playbook not found or invalid: ${playbookId} for user ${userId}`);
      throw new ForbiddenException('Playbook not found or does not belong to user.');
    }

    logger.log(`Authorization passed. Starting transaction...`);

    let importedCount = 0;
    let skippedCount = 0;

    // We use a transaction to ensure all trades are imported or none are.
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const trade of trades) {
          // Check for duplicates within this transaction scope
          const existingTrade = await tx.trade.findFirst({
            where: {
              brokerAccountId,
              userId,
              asset: trade.asset,
              entryDate: trade.entryDate,
              exitDate: trade.exitDate,
              entryPrice: trade.entryPrice,
              exitPrice: trade.exitPrice,
            },
          });

          if (existingTrade) {
            skippedCount++;
            continue;
          }

          let result: TradeResult;
          const pl = trade.profitLoss ?? 0;
          if (Math.abs(pl) < 0.01) result = TradeResult.Breakeven;
          else if (pl > 0) result = TradeResult.Win;
          else result = TradeResult.Loss;


          await tx.trade.create({
            data: {
              // Explicitly map fields from import
              asset: trade.asset,
              direction: trade.direction,
              entryDate: trade.entryDate,
              exitDate: trade.exitDate,
              entryPrice: trade.entryPrice,
              exitPrice: trade.exitPrice,
              lotSize: trade.lotSize,
              profitLoss: trade.profitLoss,
              commission: trade.commission,
              swap: trade.swap,
              result,
              // These are required fields, but not in the import data, so we need defaults.
              riskPercentage: 0, // Defaulting to 0 as it's not in the CSV
              isPendingOrder: false,
              // Use relations for safety
              user: { connect: { id: userId } },
              brokerAccount: { connect: { id: brokerAccountId } },
              playbook: { connect: { id: playbookId } },
              // playbookSetupId is now optional, so we don't set it for bulk imports
            },
          });
          importedCount++;
        }
      }, {
        maxWait: 60000, // 60 seconds wait time for large imports
        timeout: 120000, // 120 seconds total timeout for large imports
      });

      logger.log(`Transaction complete: ${importedCount} imported, ${skippedCount} skipped.`);

      // Recalculate account balance after successful transaction
      await this.accountsService.recalculateBalance(brokerAccountId, userId);

      return { imported: importedCount, skipped: skippedCount };
    } catch (error) {
      logger.error(`Error during bulk import transaction:`, error.stack || error);
      throw new BadRequestException(`Failed to import trades: ${error.message || 'Unknown error'}`);
    }
  }

  async findAllByAccount(userId: string, brokerAccountId: string) {
    const account = await this.prisma.brokerAccount.findFirst({
      where: { id: brokerAccountId, userId },
      include: { smartLimits: true },
    });
    if (!account) {
      throw new NotFoundException('Broker account not found or does not belong to the user.');
    }

    const trades = await this.prisma.trade.findMany({
      where: { userId, brokerAccountId },
      include: {
        aiAnalysis: true,
        tradeJournal: true,
        mistakes: { include: { tag: true } },
      },
      orderBy: { entryDate: 'desc' },
    });

    return trades.map((t) => this.withDerivedR(t, account));
  }

  /**
   * Attach computed R-multiples to a trade.
   *  - realisedR = realised P&L ÷ the account's risk unit (risk-per-trade % of
   *    initial balance). This replaces the old ±1R placeholder.
   *  - planR     = stored rr if present, else derived from entry/SL/TP.
   *  - mistakeTags = flattened mistake-tag labels for the Journal.
   * Risk unit falls back to 1% when no SmartLimit risk-per-trade is configured.
   */
  private withDerivedR(t: any, account: any) {
    const riskPct =
      account?.smartLimits?.maxRiskPerTrade && account.smartLimits.maxRiskPerTrade > 0
        ? account.smartLimits.maxRiskPerTrade
        : 1;
    const riskUnit = (riskPct / 100) * (account?.initialBalance || 0);

    const realisedR =
      riskUnit > 0 && t.profitLoss != null
        ? Math.round((t.profitLoss / riskUnit) * 100) / 100
        : null;

    let planR: number | null = t.rr ?? null;
    if (planR == null && t.stopLoss != null && t.takeProfit != null && t.entryPrice != null) {
      const risk = Math.abs(t.entryPrice - t.stopLoss);
      const reward = Math.abs(t.takeProfit - t.entryPrice);
      if (risk > 0) planR = Math.round((reward / risk) * 100) / 100;
    }

    return {
      ...t,
      realisedR,
      planR,
      riskUnit,
      mistakeTags: (t.mistakes || []).map((m: any) => m.tag?.label).filter(Boolean),
    };
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

    const updatedTrade = await this.prisma.trade.update({
      where: { id },
      data: dataToUpdate,
      include: {
        aiAnalysis: true,
        tradeJournal: true,
      }
    });

    await this.accountsService.recalculateBalance(updatedTrade.brokerAccountId, userId);

    return updatedTrade;
  }

  async remove(id: string, userId: string) {
    const tradeToDelete = await this.findOne(id, userId); // Authorization check

    await this.prisma.trade.delete({
      where: { id },
    });

    await this.accountsService.recalculateBalance(tradeToDelete.brokerAccountId, userId);

    return { message: 'Trade deleted successfully.' };
  }

  async bulkRemove(userId: string, tradeIds: string[]) {
    if (!tradeIds || tradeIds.length === 0) {
      return { message: 'No trades to delete.' };
    }

    // Find the first trade to identify the broker account
    const firstTrade = await this.prisma.trade.findFirst({
      where: { id: tradeIds[0], userId },
    });

    if (!firstTrade) {
      // This case handles if the first ID is invalid or doesn't belong to the user.
      throw new ForbiddenException('You do not have permission to delete these trades.');
    }
    const brokerAccountId = firstTrade.brokerAccountId;

    // Verify all trades belong to the user in a single query for efficiency
    const tradesCount = await this.prisma.trade.count({
      where: {
        id: { in: tradeIds },
        userId,
      },
    });

    if (tradesCount !== tradeIds.length) {
      throw new ForbiddenException('Some trades do not belong to you or do not exist.');
    }

    // Delete all specified trades in a single transaction
    await this.prisma.trade.deleteMany({
      where: {
        id: { in: tradeIds },
      },
    });

    // Recalculate balance for the affected account after deletion
    await this.accountsService.recalculateBalance(brokerAccountId, userId);

    return { message: `${tradeIds.length} trades deleted successfully.` };
  }
}
