import { IsString, IsNotEmpty, IsEnum, IsNumber, Min, IsOptional, IsBoolean } from 'class-validator';

// These must align with the Prisma schema enums
enum Direction {
  Buy = 'Buy',
  Sell = 'Sell',
}

export class CreateTradeDto {
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
  notes?: string;

  @IsString()
  @IsNotEmpty()
  brokerAccountId: string;

  @IsString()
  @IsNotEmpty()
  strategyId: string;
}