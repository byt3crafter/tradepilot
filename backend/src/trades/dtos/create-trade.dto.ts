import { IsString, IsNotEmpty, IsEnum, IsNumber, Min, IsOptional, IsBoolean, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

// These must align with the Prisma schema enums
enum Direction {
  Buy = 'Buy',
  Sell = 'Sell',
}

export class CreateTradeDto {
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  entryDate?: Date;

  @IsString()
  @IsNotEmpty()
  asset: string;

  @IsEnum(Direction)
  @IsNotEmpty()
  direction: Direction;

  @IsNumber()
  entryPrice: number;
  
  @IsNumber()
  @Min(0)
  riskPercentage: number;
  
  @IsBoolean()
  @IsOptional()
  isPendingOrder?: boolean;
  
  @IsString()
  @IsNotEmpty()
  brokerAccountId: string;

  // FIX: Renamed 'strategyId' to 'playbookId' to align with the rest of the application's data model.
  @IsString()
  @IsNotEmpty()
  playbookId: string;

  @IsNumber()
  @IsOptional()
  lotSize?: number;

  @IsNumber()
  @IsOptional()
  stopLoss?: number;

  @IsNumber()
  @IsOptional()
  takeProfit?: number;
}