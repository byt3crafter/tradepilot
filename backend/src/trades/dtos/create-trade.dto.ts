import { IsString, IsNotEmpty, IsEnum, IsNumber, Min, Max, IsInt, IsOptional, IsBoolean, IsDate, IsArray, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { Direction, TradeResult } from '@prisma/client';

export class CreateTradeDto {
  // Redesign capture fields (all optional / advanced)
  @IsInt() @Min(1) @Max(5) @IsOptional()
  confidence?: number | null;

  @IsNumber() @IsOptional()
  mae?: number | null;

  @IsNumber() @IsOptional()
  mfe?: number | null;

  @IsNumber() @IsOptional()
  commission?: number | null;

  @IsNumber() @IsOptional()
  swap?: number | null;

  @IsString() @IsOptional()
  screenshotAfterUrl?: string | null;

  @IsArray() @IsString({ each: true }) @IsOptional()
  mistakeTags?: string[];

  @IsObject() @IsOptional()
  preTradeChecklistState?: any;

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

  @IsString()
  @IsNotEmpty()
  playbookId: string;

  @IsString()
  @IsOptional()
  playbookSetupId?: string;

  @IsNumber()
  @IsOptional()
  lotSize?: number | null;

  @IsNumber()
  @IsOptional()
  stopLoss?: number | null;

  @IsNumber()
  @IsOptional()
  takeProfit?: number | null;

  @IsString()
  @IsOptional()
  screenshotBeforeUrl?: string | null;

  @IsNumber()
  @IsOptional()
  exitPrice?: number | null;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  exitDate?: Date | null;

  @IsNumber()
  @IsOptional()
  profitLoss?: number | null;

  @IsEnum(TradeResult)
  @IsOptional()
  result?: TradeResult | null;

  @IsString()
  @IsOptional()
  status?: string;
}