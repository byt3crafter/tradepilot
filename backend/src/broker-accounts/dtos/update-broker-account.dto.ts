import { IsString, IsNotEmpty, IsEnum, IsNumber, Min, IsOptional } from 'class-validator';

// This needs to align with the Prisma enum in schema.prisma
enum BrokerAccountType {
  DEMO = 'DEMO',
  LIVE = 'LIVE',
  PROP_FIRM = 'PROP_FIRM',
}

export class UpdateBrokerAccountDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsEnum(BrokerAccountType)
  @IsNotEmpty()
  @IsOptional()
  type?: BrokerAccountType;

  @IsNumber()
  @Min(0)
  @IsOptional()
  initialBalance?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  currentBalance?: number;
}
