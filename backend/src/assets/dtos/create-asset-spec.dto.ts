import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class CreateAssetSpecDto {
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @IsString()
  @IsNotEmpty()
  name: string;
  
  @IsNumber()
  @IsOptional()
  valuePerPoint?: number;

  @IsNumber()
  @IsOptional()
  pipSize?: number;

  @IsNumber()
  @IsOptional()
  lotSize?: number;
}