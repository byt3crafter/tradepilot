import { IsString, IsNotEmpty } from 'class-validator';

export class CreateTradeJournalDto {
  @IsString()
  @IsNotEmpty()
  mindsetBefore: string;

  @IsString()
  @IsNotEmpty()
  exitReasoning: string;

  @IsString()
  @IsNotEmpty()
  lessonsLearned: string;
}
