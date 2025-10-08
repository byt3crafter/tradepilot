import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class GenerateIdeaDto {
  @IsString()
  @IsNotEmpty()
  asset: string;

  @IsString()
  @IsNotEmpty()
  strategyType: string;

  @IsString()
  @IsOptional()
  screenshotUrl?: string;
}
