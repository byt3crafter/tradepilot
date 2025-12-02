import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TradesService } from '../trades/trades.service';
import { CreateTradeJournalDto } from './dto/create-trade-journal.dto';
import { UpdateTradeJournalDto } from './dto/update-trade-journal.dto';

@Injectable()
export class TradeJournalsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly tradesService: TradesService
    ) {}

    async create(userId: string, tradeId: string, createDto: CreateTradeJournalDto) {
        // Ensure the user owns the trade they are trying to journal
        await this.tradesService.findOne(tradeId, userId);

        return this.prisma.tradeJournal.create({
            data: {
                ...createDto,
                tradeId,
            }
        });
    }

    async update(userId: string, journalId: string, updateDto: UpdateTradeJournalDto) {
        const journal = await this.prisma.tradeJournal.findUnique({
            where: { id: journalId },
            include: { trade: true }
        });

        if (!journal) {
            throw new NotFoundException('Journal entry not found.');
        }

        if (journal.trade.userId !== userId) {
            throw new ForbiddenException('You do not have permission to edit this journal entry.');
        }

        return this.prisma.tradeJournal.update({
            where: { id: journalId },
            data: updateDto
        });
    }
}