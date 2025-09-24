
import { IsString, IsNotEmpty, IsEnum, IsNumber, Min, IsOptional, IsBoolean, IsObject, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
// FIX: The import from '@prisma/client' fails when `prisma generate` has not been run.
// import { Direction, TradeResult } from '@prisma/client';

// FIX: Define local enums to satisfy TypeScript during compile time.
export enum Direction {
    Buy = 'Buy',
    Sell = 'Sell',
}
export enum TradeResult {
  Win = 'Win',
  Loss = 'Loss',
  Breakeven = 'Breakeven',
}

export class UpdateTradeDto {
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  entryDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  exitDate?: Date | null;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  asset?: string;

  @IsEnum(Direction)
  @IsOptional()
  direction?: Direction;

  @IsNumber()
  @IsOptional()
  entryPrice?: number;
  
  @IsNumber()
  @IsOptional()
  exitPrice?: number | null;

  @IsNumber()
  @Min(0)
  @IsOptional()
  riskPercentage?: number;
  
  @IsNumber()
  @IsOptional()
  rr?: number | null;

  @IsNumber()
  @IsOptional()
  profitLoss?: number | null;
  
  @IsEnum(TradeResult)
  @IsOptional()
  result?: TradeResult | null;
  
  @IsString()
  @IsOptional()
  screenshotBeforeUrl?: string | null;

  @IsString()
  @IsOptional()
  screenshotAfterUrl?: string | null;

  @IsObject()
  @IsOptional()
  aiAnalysis?: any | null;
  
  @IsBoolean()
  @IsOptional()
  isPendingOrder?: boolean;

  @IsNumber()
  @IsOptional()
  lotSize?: number | null;

  @IsNumber()
  @IsOptional()
  stopLoss?: number | null;

  @IsNumber()
  @IsOptional()
  takeProfit?: number | null;

  @IsNumber()
  @IsOptional()
  commission?: number | null;

  @IsNumber()
  @IsOptional()
  swap?: number | null;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  playbookId?: string;
}