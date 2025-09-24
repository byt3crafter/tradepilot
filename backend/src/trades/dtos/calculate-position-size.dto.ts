import { IsString, IsNotEmpty, IsEnum, IsNumber } from 'class-validator';

enum Direction {
  Buy = 'Buy',
  Sell = 'Sell',
}

export class CalculatePositionSizeDto {
  @IsString()
  @IsNotEmpty()
  asset: string;

  @IsNumber()
  riskPercentage: number;
  
  @IsNumber()
  entryPrice: number;

  @IsNumber()
  stopLoss: number;

  @IsNumber()
  accountBalance: number;

  @IsEnum(Direction)
  direction: Direction;
}