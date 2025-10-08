import {
  IsString, IsNotEmpty, IsEnum, IsOptional, IsArray, IsInt, IsDate
} from 'class-validator';
import { Type } from 'class-transformer';
import { IncomeCategory, AssetClass, MarketVenue, InstrumentSubtype, Direction, ReviewCycle } from '@prisma/client';

export class CreateAnalysisDto {
  @IsString()
  @IsNotEmpty()
  brokerId: string;
  
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  screenshotUrls?: string[];

  @IsEnum(IncomeCategory)
  category: IncomeCategory;

  @IsEnum(AssetClass)
  assetClass: AssetClass;

  @IsEnum(MarketVenue)
  marketVenue: MarketVenue;

  @IsEnum(InstrumentSubtype)
  @IsOptional()
  instrumentSubtype?: InstrumentSubtype;

  @IsOptional()
  contract?: any;

  @IsInt()
  @IsOptional()
  leverage?: number;

  @IsString()
  @IsNotEmpty()
  symbol: string;
  
  @IsString()
  @IsOptional()
  htf?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  ltf?: string[];

  @IsEnum(Direction)
  directionalBias: Direction;

  @IsString()
  @IsOptional()
  structureNotes?: string;
  
  @IsEnum(ReviewCycle)
  reviewCycle: ReviewCycle;

  @IsDate()
  @Type(() => Date)
  nextReviewAt: Date;
}