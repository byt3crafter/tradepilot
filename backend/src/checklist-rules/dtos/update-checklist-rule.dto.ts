import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class UpdateChecklistRuleDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  rule?: string;
}
