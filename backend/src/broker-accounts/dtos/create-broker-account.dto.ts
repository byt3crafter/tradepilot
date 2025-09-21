import { IsString, IsNotEmpty, IsEnum, IsNumber, Min, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

enum BrokerAccountType {
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

  @IsOptional()
  @ValidateNested()
  @Type(() => TradingObjectiveDto)
  objectives?: TradingObjectiveDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SmartLimitDto)
  smartLimits?: SmartLimitDto;
}