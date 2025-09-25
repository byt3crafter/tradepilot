import { IsString, IsNotEmpty, IsEnum, IsNumber, Min, IsOptional, IsBoolean, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
// FIX: Changed import to wildcard to resolve module member issues.
import * as client from '@prisma/client';

export class CreateTradeDto {
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  entryDate?: Date;

  @IsString()
  @IsNotEmpty()
  asset: string;

  @IsEnum(['Buy', 'Sell'])
  @IsNotEmpty()
  direction: client.Direction;

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
}