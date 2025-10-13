import { IsString, IsNotEmpty, IsEnum, IsNumber, Min, IsOptional, ValidateNested, IsBoolean, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { BrokerAccountType } from '@prisma/client';

class TradingObjectiveDto {
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

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
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

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


export class UpdateBrokerAccountDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsEnum(BrokerAccountType)
  @IsNotEmpty()
  @IsOptional()
  type?: BrokerAccountType;

  @IsNumber()
  @Min(0)
  @IsOptional()
  initialBalance?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  currentBalance?: number;

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