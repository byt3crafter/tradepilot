
import { IsString, IsNotEmpty, IsEnum, IsNumber, Min, IsOptional, IsBoolean, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
// FIX: The import from '@prisma/client' fails when `prisma generate` has not been run.
// import { Direction } from '@prisma/client';

// FIX: Define local enum to satisfy TypeScript during compile time.
export enum Direction {
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