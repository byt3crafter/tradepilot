import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateStrategyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;
}
