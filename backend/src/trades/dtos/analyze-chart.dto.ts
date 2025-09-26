import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';

export class AnalyzeChartDto {
  @IsString()
  @IsNotEmpty()
  screenshotUrl: string; // Base64 Data URL

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  availableAssets?: string[];
}
