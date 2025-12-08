import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from '../billing/billing.service';

@Injectable()
export class PromoCodesService {
    constructor(
        private prisma: PrismaService,
        private billingService: BillingService
    ) { }

    async create(data: { code: string; type: 'PERCENTAGE' | 'FIXED_AMOUNT'; value: number; maxUses?: number; expiresAt?: Date }) {
        const existing = await this.prisma.promoCode.findUnique({ where: { code: data.code } });
        if (existing) {
            throw new BadRequestException('Promo code already exists');
        }

        // Create discount in Paddle
        let paddleDiscountId: string | null = null;
        try {
            const paddleType = data.type === 'PERCENTAGE' ? 'percentage' : 'flat';
            const discount = await this.billingService.createDiscount(data.code, paddleType, data.value);
            paddleDiscountId = discount.id;
        } catch (err) {
            console.error('Failed to create Paddle discount', err);
            // We might want to fail creation if Paddle fails, or proceed with warning?
            // For now, let's fail to ensure consistency.
            throw new BadRequestException('Failed to create discount in payment provider');
        }

        return this.prisma.promoCode.create({
            data: {
                ...data,
                paddleDiscountId
            }
        });
    }

    async findAll() {
        return this.prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } });
    }

    async delete(id: string) {
        return this.prisma.promoCode.delete({ where: { id } });
    }

    async validate(code: string) {
        const promo = await this.prisma.promoCode.findUnique({ where: { code } });

        if (!promo) {
            throw new NotFoundException('Invalid promo code');
        }

        if (!promo.isActive) {
            throw new BadRequestException('Promo code is inactive');
        }

        if (promo.expiresAt && new Date() > promo.expiresAt) {
            throw new BadRequestException('Promo code has expired');
        }

        if (promo.maxUses && promo.usedCount >= promo.maxUses) {
            throw new BadRequestException('Promo code usage limit reached');
        }

        return promo;
    }

    async incrementUsage(code: string) {
        const promo = await this.prisma.promoCode.findUnique({ where: { code } });
        if (promo) {
            await this.prisma.promoCode.update({
                where: { id: promo.id },
                data: { usedCount: { increment: 1 } },
            });
        }
    }
}
