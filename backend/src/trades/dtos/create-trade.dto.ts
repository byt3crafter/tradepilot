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

  @IsString()
  @IsNotEmpty()
  playbookId: string;

  @IsNumber()
  @IsOptional()
  stopLoss?: number | null;

  @IsNumber()
  @IsOptional()
  takeProfit?: number | null;

  @IsNumber()
  @IsOptional()
  rr?: number | null;
}