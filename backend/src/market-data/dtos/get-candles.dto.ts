import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

const INTERVALS = ['1min', '5min', '15min', '30min', '45min', '1h', '2h', '4h', '1day', '1week'];

export class GetCandlesDto {
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @IsOptional()
  @IsIn(INTERVALS)
  interval?: string;

  /** ISO date/datetime, e.g. 2026-01-20 or 2026-01-20 14:00:00 */
  @IsString()
  @IsOptional()
  start?: string;

  @IsString()
  @IsOptional()
  end?: string;
}
