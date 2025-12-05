import { IsString, IsNumber, IsEnum, IsBoolean, IsOptional, Min } from 'class-validator';
import { DrawdownType } from '@prisma/client';

export class CreatePropFirmTemplateDto {
  @IsString()
  name: string;

  @IsString()
  firmName: string;

  @IsNumber()
  @Min(0)
  accountSize: number;

  @IsNumber()
  @Min(0)
  profitTarget: number;

  @IsNumber()
  @Min(0)
  dailyDrawdown: number;

  @IsNumber()
  @Min(0)
  maxDrawdown: number;

  @IsEnum(DrawdownType)
  drawdownType: DrawdownType;

  @IsNumber()
  @Min(1)
  minTradingDays: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
