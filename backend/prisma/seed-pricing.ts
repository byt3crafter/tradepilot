import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Pricing Plans...');

    const plans = [
        {
            name: 'TradePilot Pro Monthly',
            description: 'Flexible monthly subscription.',
            interval: 'month',
            amount: 5.99,
            currency: 'USD',
            paddlePriceId: process.env.VITE_PADDLE_PRICE_ID_MONTHLY || 'pri_01k5kb3jt97f5x5708vcrg14hc',
            isBestValue: false,
            features: [
                'Live Trade Journaling',
                'AI-Powered Edge Analysis',
                'Unlimited Playbooks',
                'Advanced Risk Analytics',
                'Multi-Account Support'
            ]
        },
        {
            name: 'TradePilot Pro Yearly',
            description: 'Best value annual subscription.',
            interval: 'year',
            amount: 60.00,
            currency: 'USD',
            paddlePriceId: process.env.VITE_PADDLE_PRICE_ID_YEARLY || 'pri_01k5kb9m0n3d7c3h5y8r0t8x1r',
            isBestValue: true,
            features: [
                'All Monthly Features',
                'Priority Feature Access',
                'Exclusive Beta Testing'
            ]
        }
    ];

    for (const plan of plans) {
        const existing = await prisma.pricingPlan.findFirst({
            where: { paddlePriceId: plan.paddlePriceId }
        });

        if (!existing) {
            await prisma.pricingPlan.create({
                data: plan
            });
            console.log(`Created plan: ${plan.name}`);
        } else {
            console.log(`Plan ${plan.name} already exists. Skipping.`);
        }
    }

    console.log('Seeding completed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
