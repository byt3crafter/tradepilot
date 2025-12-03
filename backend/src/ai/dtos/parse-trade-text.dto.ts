import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export class ParseTradeTextDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsArray()
  @IsOptional()
  availableAssets?: string[];
}
