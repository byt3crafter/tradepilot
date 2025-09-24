import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ChecklistItemDto {
  @IsString()
  @IsNotEmpty()
  text: string;
}

class PlaybookSetupDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  screenshotBeforeUrl?: string;

  @IsString()
  @IsOptional()
  screenshotAfterUrl?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  @IsOptional()
  entryCriteria?: ChecklistItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChecklistItemDto)
  @IsOptional()
  riskManagement?: ChecklistItemDto[];
}

export class CreatePlaybookDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  coreIdea?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
  
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tradingStyles?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  instruments?: string[];
  
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  timeframes?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  pros?: string[];
  
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  cons?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PlaybookSetupDto)
  @IsOptional()
  setups?: PlaybookSetupDto[];
}