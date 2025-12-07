import { IsString, IsNotEmpty, IsEnum, IsNumber, Min, IsOptional, IsBoolean, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { Direction, TradeResult } from '@prisma/client';

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