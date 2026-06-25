import { IsString, IsNotEmpty, IsEnum, IsNumber, Min, Max, IsInt, IsOptional, IsBoolean, IsObject, IsDate, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { Direction, TradeResult } from '@prisma/client';

export class UpdateTradeDto {
  // Redesign capture fields
  @IsInt() @Min(1) @Max(5) @IsOptional()
  confidence?: number | null;

  @IsNumber() @IsOptional()
  mae?: number | null;

  @IsNumber() @IsOptional()
  mfe?: number | null;

  @IsArray() @IsString({ each: true }) @IsOptional()
  mistakeTags?: string[];

  @IsObject() @IsOptional()
  preTradeChecklistState?: any;

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

  @IsString()
  @IsOptional()
  playbookSetupId?: string | null;
}