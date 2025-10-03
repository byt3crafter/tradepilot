import { IsString, IsNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BulkImportTradeItemDto } from './bulk-import-trade-item.dto';

export class BulkImportTradesDto {
  @IsString()
  @IsNotEmpty()
  brokerAccountId: string;

  @IsString()
  @IsNotEmpty()
  playbookId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkImportTradeItemDto)
  trades: BulkImportTradeItemDto[];
}
