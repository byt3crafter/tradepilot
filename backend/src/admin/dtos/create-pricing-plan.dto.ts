import { IsString, IsNumber, IsBoolean, IsArray, IsEnum } from 'class-validator';

export class CreatePricingPlanDto {
    @IsString()
    paddlePriceId: string;

    @IsString()
    name: string;

    @IsString()
    @IsEnum(['month', 'year'])
    interval: string;

    @IsNumber()
    amount: number;

    @IsString()
    currency: string;

    @IsBoolean()
    isActive: boolean;

    @IsBoolean()
    isBestValue: boolean;

    @IsArray()
    features: string[];
}
