import { IsString, IsNotEmpty, IsEnum, IsNumber } from 'class-validator';

enum Direction {
  Buy = 'Buy',
  Sell = 'Sell',
}

export class CalculateRiskDto {
  @IsString()
  @IsNotEmpty()
  asset: string;

  @IsNumber()
  lotSize: number;
  
  @IsNumber()
  entryPrice: number;

  @IsNumber()
  stopLoss: number;

  @IsNumber()
  accountBalance: number;

  @IsEnum(Direction)
  direction: Direction;
}