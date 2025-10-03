
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlaybookDto } from './dtos/create-playbook.dto';
import { UpdatePlaybookDto } from './dtos/update-playbook.dto';
// FIX: Use named imports for Prisma types to resolve module export errors.
import { ChecklistItemType, Trade } from '@prisma/client';

@Injectable()
export class PlaybooksService {
  constructor(private readonly prisma: PrismaService) {}

  // Helper function to transform the Prisma result to match the frontend's expected structure.
  private transformPlaybook(playbook: any) {
    if (!playbook) return null;

    const transformedSetups = playbook.setups.map((setup: any) => {
      const entryCriteria = setup.checklistItems.filter((item: any) => item.type === 'ENTRY_CRITERIA');
      const riskManagement = setup.checklistItems.filter((item: any) => item.type === 'RISK_MANAGEMENT');
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { checklistItems, ...restOfSetup } = setup;
      return { ...restOfSetup, entryCriteria, riskManagement };
    });

    return { ...playbook, setups: transformedSetups };
  }

  async create(userId: string, createDto: CreatePlaybookDto) {
    const { setups, ...playbookData } = createDto;

    return this.prisma.playbook.create({
      data: {
        ...playbookData,
        userId,
        setups: {
          create: setups?.map(setup => {
            const entryCriteriaItems = setup.entryCriteria?.map(item => ({
              text: item.text,
              type: ChecklistItemType.ENTRY_CRITERIA,
            })) || [];
            
            const riskManagementItems = setup.riskManagement?.map(item => ({
              text: item.text,
              type: ChecklistItemType.RISK_MANAGEMENT,
            })) || [];
            
            return {
              name: setup.name,
              screenshotBeforeUrl: setup.screenshotBeforeUrl,
              screenshotAfterUrl: setup.screenshotAfterUrl,
              checklistItems: {
                create: [...entryCriteriaItems, ...riskManagementItems],
              },
            };
          }) || [],
        },
      },
    });
  }

  async findAll(userId: string) {
    const playbooks = await this.prisma.playbook.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      include: {
        setups: {
          include: {
            checklistItems: true,
          },
        },
      },
    });
    return playbooks.map((p: any) => this.transformPlaybook(p));
  }

  async findAllPublic(currentUserId: string) {
    const publicPlaybooks = await this.prisma.playbook.findMany({
      where: {
        isPublic: true,
      },
      include: { // Use include instead of select to get all relations
        user: {
          select: {
            fullName: true,
          },
        },
        setups: {
          include: {
            checklistItems: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return publicPlaybooks.map((playbook) => {
      const transformed = this.transformPlaybook(playbook); // Reuse existing transformer
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { userId, ...rest } = transformed; // Remove userId for privacy
      return {
        ...rest,
        authorName: playbook.user.fullName,
      };
    });
  }

  async findOne(id: string, userId: string, transform = true) {
    const playbook = await this.prisma.playbook.findUnique({
      where: { id },
      include: {
        setups: {
          include: {
            checklistItems: true,
          },
        },
      },
    });

    if (!playbook) {
      throw new NotFoundException(`Playbook with ID ${id} not found.`);
    }
    if (playbook.userId !== userId) {
      throw new ForbiddenException('You are not authorized to access this playbook.');
    }
    return transform ? this.transformPlaybook(playbook) : playbook;
  }

  async update(id: string, userId: string, updateDto: UpdatePlaybookDto) {
    await this.findOne(id, userId, false); // Authorization check without transformation
    const { setups, ...playbookData } = updateDto;

    const updatedPlaybook = await this.prisma.playbook.update({
        where: { id },
        data: {
            ...playbookData,
            setups: {
                deleteMany: {},
                create: setups?.map(setup => {
                  const entryCriteriaItems = setup.entryCriteria?.map(item => ({
                    text: item.text,
                    type: ChecklistItemType.ENTRY_CRITERIA,
                  })) || [];
                  
                  const riskManagementItems = setup.riskManagement?.map(item => ({
                    text: item.text,
                    type: ChecklistItemType.RISK_MANAGEMENT,
                  })) || [];

                  return {
                    name: setup.name,
                    screenshotBeforeUrl: setup.screenshotBeforeUrl,
                    screenshotAfterUrl: setup.screenshotAfterUrl,
                    checklistItems: {
                      create: [...entryCriteriaItems, ...riskManagementItems],
                    },
                  };
                }) || [],
            },
        },
        include: {
          setups: {
            include: {
              checklistItems: true,
            },
          },
        },
    });
    return this.transformPlaybook(updatedPlaybook);
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId, false); // Authorization check
    await this.prisma.playbook.delete({ where: { id } });
    return { message: 'Playbook deleted successfully.' };
  }

  async getPlaybookStats(id: string, userId: string) {
    await this.findOne(id, userId, false); // Authorization check

    const closedTrades = await this.prisma.trade.findMany({
      where: {
        playbookId: id,
        userId,
        result: { not: null },
      },
      orderBy: { exitDate: 'asc' },
    });

    if (closedTrades.length === 0) {
      return {
        netPL: 0,
        totalTrades: 0,
        winRate: 0,
        avgWin: 0,
        avgLoss: 0,
        profitFactor: 0,
        expectancy: 0,
        avgHoldTimeHours: 0,
        equityCurve: [],
      };
    }

    const winningTrades = closedTrades.filter((t: Trade) => t.result === 'Win');
    const losingTrades = closedTrades.filter((t: Trade) => t.result === 'Loss');
    
    const grossProfit = winningTrades.reduce((sum: number, trade: Trade) => sum + (trade.profitLoss ?? 0), 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum: number, trade: Trade) => sum + (trade.profitLoss ?? 0), 0));
    
    const totalCommission = closedTrades.reduce((sum: number, trade: Trade) => sum + (trade.commission ?? 0), 0);
    const totalSwap = closedTrades.reduce((sum: number, trade: Trade) => sum + (trade.swap ?? 0), 0);
    
    const netPL = grossProfit - grossLoss - totalCommission - totalSwap;
    
    const tradesForRate = winningTrades.length + losingTrades.length;
    const winRate = tradesForRate > 0 ? (winningTrades.length / tradesForRate) * 100 : 0;
    
    const avgWin = winningTrades.length > 0 ? grossProfit / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? grossLoss / losingTrades.length : 0;
    
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : Infinity;
    
    const expectancy = (winRate / 100 * avgWin) - ((1 - (winRate / 100)) * avgLoss);

    const totalHoldTimeMs = closedTrades.reduce((sum: number, trade: Trade) => {
        if (trade.entryDate && trade.exitDate) {
            return sum + (new Date(trade.exitDate).getTime() - new Date(trade.entryDate).getTime());
        }
        return sum;
    }, 0);
    const avgHoldTimeHours = closedTrades.length > 0 ? (totalHoldTimeMs / closedTrades.length) / (1000 * 60 * 60) : 0;

    let cumulativePL = 0;
    const equityCurve = closedTrades.map((trade: Trade) => {
        const tradeNetPL = (trade.profitLoss ?? 0) - (trade.commission ?? 0) - (trade.swap ?? 0);
        cumulativePL += tradeNetPL;
        return {
            date: trade.exitDate!.toISOString().split('T')[0],
            cumulativePL,
        };
    });

    return {
      netPL,
      totalTrades: closedTrades.length,
      winRate,
      avgWin,
      avgLoss,
      profitFactor,
      expectancy,
      avgHoldTimeHours,
      equityCurve,
    };
  }
}
