import { IsString, IsOptional } from 'class-validator';

export class UpdateTradeJournalDto {
  @IsString()
  @IsOptional()
  mindsetBefore?: string;

  @IsString()
  @IsOptional()
  exitReasoning?: string;

  @IsString()
  @IsOptional()
  lessonsLearned?: string;
}
