import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class UpdateAssetSpecDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  symbol?: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

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