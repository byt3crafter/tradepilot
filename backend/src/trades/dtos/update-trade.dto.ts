import { IsString, IsNotEmpty, IsEnum, IsNumber, Min, IsOptional, IsBoolean, IsObject, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
// FIX: Changed import to wildcard to resolve module member issues.
import * as client from '@prisma/client';

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

  @IsEnum(['Buy', 'Sell'])
  @IsOptional()
  direction?: client.Direction;

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
  
  @IsEnum(client.TradeResult)
  @IsOptional()
  result?: client.TradeResult | null;
  
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