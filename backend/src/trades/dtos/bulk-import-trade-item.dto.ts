import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { Direction } from '@prisma/client';

export class BulkImportTradeItemDto {
  @IsString()
  @IsNotEmpty()
  asset: string;

  @IsEnum(Direction)
  @IsNotEmpty()
  direction: Direction;

  @IsDate()
  @Type(() => Date)
  entryDate: Date;

  @IsDate()
  @Type(() => Date)
  exitDate: Date;

  @IsNumber()
  entryPrice: number;
  
  @IsNumber()
  exitPrice: number;
  
  @IsNumber()
  @IsOptional()
  lotSize?: number | null;

  @IsNumber()
  @IsOptional()
  profitLoss?: number | null;
  
  @IsNumber()
  @IsOptional()
  commission?: number | null;

  @IsNumber()
  @IsOptional()
  swap?: number | null;
}