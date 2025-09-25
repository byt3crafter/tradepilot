import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetSpecDto } from './dtos/create-asset-spec.dto';
import { UpdateAssetSpecDto } from './dtos/update-asset-spec.dto';
// FIX: Changed import to wildcard to resolve module member issues.
import * as client from '@prisma/client';

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createDto: CreateAssetSpecDto): Promise<client.AssetSpecification> {
    return this.prisma.assetSpecification.create({
      data: {
        symbol: createDto.symbol,
        name: createDto.name,
        valuePerPoint: createDto.valuePerPoint ?? 1,
        pipSize: createDto.pipSize ?? 0.0001,
        lotSize: createDto.lotSize ?? 100000,
        userId,
      },
    });
  }

  async findAll(userId: string): Promise<client.AssetSpecification[]> {
    return this.prisma.assetSpecification.findMany({
      where: { userId },
      orderBy: { symbol: 'asc' },
    });
  }
  
  async findOne(id: string, userId: string): Promise<client.AssetSpecification> {
    const assetSpec = await this.prisma.assetSpecification.findUnique({
      where: { id },
    });

    if (!assetSpec) {
      throw new NotFoundException(`Asset with ID ${id} not found.`);
    }
    if (assetSpec.userId !== userId) {
      throw new ForbiddenException('You are not authorized to access this asset.');
    }
    return assetSpec;
  }
  
  async update(id: string, userId: string, updateDto: UpdateAssetSpecDto): Promise<client.AssetSpecification> {
    await this.findOne(id, userId); // Authorization check
    return this.prisma.assetSpecification.update({
      where: { id },
      data: updateDto,
    });
  }
  
  async remove(id: string, userId: string) {
    await this.findOne(id, userId); // Authorization check
    await this.prisma.assetSpecification.delete({
      where: { id },
    });
    return { message: 'Asset deleted successfully.' };
  }

  async seedDefaultAssetsForUser(userId: string) {
    const defaultAssets = [
        { symbol: 'EURUSD', name: 'Euro vs US Dollar', pipSize: 0.0001, lotSize: 100000, valuePerPoint: 10 },
        { symbol: 'GBPUSD', name: 'Great British Pound vs US Dollar', pipSize: 0.0001, lotSize: 100000, valuePerPoint: 10 },
        { symbol: 'USDJPY', name: 'US Dollar vs Japanese Yen', pipSize: 0.01, lotSize: 100000, valuePerPoint: 10 },
        { symbol: 'USDCAD', name: 'US Dollar vs Canadian Dollar', pipSize: 0.0001, lotSize: 100000, valuePerPoint: 10 },
        { symbol: 'AUDUSD', name: 'Australian Dollar vs US Dollar', pipSize: 0.0001, lotSize: 100000, valuePerPoint: 10 },
        { symbol: 'NZDUSD', name: 'New Zealand Dollar vs US Dollar', pipSize: 0.0001, lotSize: 100000, valuePerPoint: 10 },
        { symbol: 'USDCHF', name: 'US Dollar vs Swiss Franc', pipSize: 0.0001, lotSize: 100000, valuePerPoint: 10 },
        { symbol: 'US30', name: 'Dow Jones Industrial Average', pipSize: 1, lotSize: 1, valuePerPoint: 1 },
        { symbol: 'SPX500', name: 'S&P 500', pipSize: 1, lotSize: 1, valuePerPoint: 1 },
        { symbol: 'NAS100', name: 'Nasdaq 100', pipSize: 1, lotSize: 1, valuePerPoint: 1 },
        { symbol: 'BTCUSD', name: 'Bitcoin vs US Dollar', pipSize: 1, lotSize: 1, valuePerPoint: 1 },
        { symbol: 'ETHUSD', name: 'Ethereum vs US Dollar', pipSize: 1, lotSize: 1, valuePerPoint: 1 },
        { symbol: 'XAUUSD', name: 'Gold vs US Dollar', pipSize: 0.01, lotSize: 100, valuePerPoint: 10 },
        { symbol: 'XAGUSD', name: 'Silver vs US Dollar', pipSize: 0.001, lotSize: 5000, valuePerPoint: 50 },
        { symbol: 'USOIL', name: 'WTI Crude Oil', pipSize: 0.01, lotSize: 1000, valuePerPoint: 10 },
    ];
    
    await this.prisma.assetSpecification.createMany({
      data: defaultAssets.map(asset => ({
        ...asset,
        userId: userId,
      })),
      skipDuplicates: true,
    });
  }

  async findSpecBySymbol(symbol: string, userId: string): Promise<client.AssetSpecification | null> {
    if (!symbol || !userId) return null;
    const found = await this.prisma.assetSpecification.findUnique({
        where: { userId_symbol: { userId, symbol } },
    });
    return found || null;
  }
}