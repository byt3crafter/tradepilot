import { Module } from '@nestjs/common';
import { PromoCodesController } from './promo-codes.controller';
import { PromoCodesService } from './promo-codes.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingModule } from '../billing/billing.module';

@Module({
    imports: [PrismaModule, BillingModule],
    controllers: [PromoCodesController],
    providers: [PromoCodesService],
    exports: [PromoCodesService],
})
export class PromoCodesModule { }
