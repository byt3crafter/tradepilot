import { IsString, IsNotEmpty, IsEnum, IsNumber, Min, IsOptional, IsBoolean, IsObject } from 'class-validator';

enum Direction {
  Buy = 'Buy',
  Sell = 'Sell',
}

enum TradeResult {
    Win = 'Win',
    Loss = 'Loss',
    Breakeven = 'Breakeven'
}

export class UpdateTradeDto {
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
  notes?: string | null;
  
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
}