
import { IsString, IsNotEmpty, IsEnum, IsNumber, Min, IsOptional, ValidateNested, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
// FIX: The import from '@prisma/client' fails when `prisma generate` has not been run.
// import { BrokerAccountType } from '@prisma/client';

// FIX: Define local enum to satisfy TypeScript during compile time.
export enum BrokerAccountType {
  DEMO = 'DEMO',
  LIVE = 'LIVE',
  PROP_FIRM = 'PROP_FIRM',
}

class TradingObjectiveDto {
  @IsNumber()
  @IsOptional()
  profitTarget?: number;

  @IsNumber()
  @IsOptional()
  minTradingDays?: number;
  
  @IsNumber()
  @IsOptional()
  @Min(0)
  maxLoss?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  maxDailyLoss?: number;
}

class SmartLimitDto {
    @IsNumber()
    @IsOptional()
    @Min(0)
    maxRiskPerTrade?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    maxTradesPerDay?: number;

    @IsNumber()
    @IsOptional()
    @Min(0)
    maxLossesPerDay?: number;
}

export class CreateBrokerAccountDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(BrokerAccountType)
  @IsNotEmpty()
  type: BrokerAccountType;

  @IsNumber()
  @Min(0)
  initialBalance: number;
  
  @IsString()
  @IsOptional()
  currency?: string;

  @IsInt()
  @IsOptional()
  leverage?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => TradingObjectiveDto)
  objectives?: TradingObjectiveDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SmartLimitDto)
  smartLimits?: SmartLimitDto;
}