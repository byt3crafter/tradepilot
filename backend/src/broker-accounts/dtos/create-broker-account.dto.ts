import { IsString, IsNotEmpty, IsEnum, IsNumber, Min } from 'class-validator';

// This needs to align with the Prisma enum in schema.prisma
enum BrokerAccountType {
  DEMO = 'DEMO',
  LIVE = 'LIVE',
  PROP_FIRM = 'PROP_FIRM',
}

export class CreateBrokerAccountDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(BrokerAccountType)
  @IsNotEmpty()
  type: BrokerAccountType;

  @IsNumber()
  @Min(0)
  initialBalance: number;
}
