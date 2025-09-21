import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TradesService } from 'src/trades/trades.service';
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

        return (this.prisma as any).tradeJournal.create({
            data: {
                ...createDto,
                tradeId,
            }
        });
    }

    async update(userId: string, journalId: string, updateDto: UpdateTradeJournalDto) {
        const journal = await (this.prisma as any).tradeJournal.findUnique({
            where: { id: journalId },
            include: { trade: true }
        });

        if (!journal) {
            throw new NotFoundException('Journal entry not found.');
        }

        if (journal.trade.userId !== userId) {
            throw new ForbiddenException('You do not have permission to edit this journal entry.');
        }

        return (this.prisma as any).tradeJournal.update({
            where: { id: journalId },
            data: updateDto
        });
    }
}
