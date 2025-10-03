
import { IsString, IsNotEmpty, IsEnum, IsNumber, Min, IsOptional, ValidateNested, IsBoolean, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
// FIX: Use namespace import for Prisma types to resolve module export errors.
import * as pc from '@prisma/client';

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

  @IsEnum(pc.BrokerAccountType)
  @IsNotEmpty()
  @IsOptional()
  type?: pc.BrokerAccountType;

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