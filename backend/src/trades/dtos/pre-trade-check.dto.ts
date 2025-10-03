import { IsString, IsNotEmpty } from 'class-validator';

export class PreTradeCheckDto {
  @IsString()
  @IsNotEmpty()
  playbookId: string;

  @IsString()
  @IsNotEmpty()
  screenshotBeforeUrl: string; // Base64 Data URL

  @IsString()
  @IsNotEmpty()
  asset: string;
}