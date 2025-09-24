
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetSpecDto } from './dtos/create-asset-spec.dto';
import { UpdateAssetSpecDto } from './dtos/update-asset-spec.dto';
// FIX: The import from '@prisma/client' fails when `prisma generate` has not been run.
// import { AssetSpecification } from '@prisma/client';

// FIX: Define local type to satisfy TypeScript during compile time.
type AssetSpecification = any;

@Injectable()
export class AssetsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createDto: CreateAssetSpecDto): Promise<AssetSpecification> {
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

  async findAll(userId: string): Promise<AssetSpecification[]> {
    return this.prisma.assetSpecification.findMany({
      where: { userId },
      orderBy: { symbol: 'asc' },
    });
  }
  
  async findOne(id: string, userId: string): Promise<AssetSpecification> {
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
  
  async update(id: string, userId: string, updateDto: UpdateAssetSpecDto): Promise<AssetSpecification> {
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

  async findSpecBySymbol(symbol: string, userId: string): Promise<AssetSpecification | null> {
    if (!symbol || !userId) return null;
    const found = await this.prisma.assetSpecification.findUnique({
        where: { userId_symbol: { userId, symbol } },
    });
    return found || null;
  }
}