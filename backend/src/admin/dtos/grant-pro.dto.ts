import { IsDate, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class GrantProDto {
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  expiresAt?: Date | null;

  @IsString()
  @IsOptional()
  reason?: string;
}
