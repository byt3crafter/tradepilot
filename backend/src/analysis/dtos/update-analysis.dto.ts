import {
  IsString, IsEnum, IsOptional, IsArray, IsInt, IsDate
} from 'class-validator';
import { Type } from 'class-transformer';
import { IncomeCategory, AssetClass, MarketVenue, InstrumentSubtype, Direction, ReviewCycle, AnalysisStatus } from '@prisma/client';

export class UpdateAnalysisDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  screenshotUrls?: string[];

  @IsEnum(IncomeCategory)
  @IsOptional()
  category?: IncomeCategory;

  @IsEnum(AssetClass)
  @IsOptional()
  assetClass?: AssetClass;

  @IsEnum(MarketVenue)
  @IsOptional()
  marketVenue?: MarketVenue;

  @IsEnum(InstrumentSubtype)
  @IsOptional()
  instrumentSubtype?: InstrumentSubtype;

  @IsOptional()
  contract?: any;

  @IsInt()
  @IsOptional()
  leverage?: number;

  @IsString()
  @IsOptional()
  symbol?: string;
  
  @IsString()
  @IsOptional()
  htf?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  ltf?: string[];

  @IsEnum(Direction)
  @IsOptional()
  directionalBias?: Direction;

  @IsString()
  @IsOptional()
  structureNotes?: string;
  
  @IsEnum(ReviewCycle)
  @IsOptional()
  reviewCycle?: ReviewCycle;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  nextReviewAt?: Date;

  @IsEnum(AnalysisStatus)
  @IsOptional()
  status?: AnalysisStatus;
}