import { IsString, IsNotEmpty, IsEnum, IsNumber, Min, IsOptional, ValidateNested, IsBoolean, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
// FIX: Changed import to wildcard to resolve module member issues.
import * as client from '@prisma/client';

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

  @IsEnum(client.BrokerAccountType)
  @IsNotEmpty()
  @IsOptional()
  type?: client.BrokerAccountType;

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