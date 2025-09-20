import { IsString, IsNotEmpty } from 'class-validator';

export class CreateChecklistRuleDto {
  @IsString()
  @IsNotEmpty()
  rule: string;
}
