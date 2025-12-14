import { IsString, IsNumber, IsBoolean, IsArray, IsOptional } from 'class-validator';

export class UpdatePricingPlanDto {
    @IsString()
    @IsOptional()
    paddlePriceId?: string;

    @IsString()
    @IsOptional()
    name?: string;

    @IsNumber()
    @IsOptional()
    amount?: number;

    @IsString()
    @IsOptional()
    currency?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @IsBoolean()
    @IsOptional()
    isBestValue?: boolean;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    features?: string[];
}
