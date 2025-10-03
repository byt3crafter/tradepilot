import { IsArray, IsString } from 'class-validator';

export class BulkDeleteTradesDto {
  @IsArray()
  @IsString({ each: true })
  tradeIds: string[];
}
