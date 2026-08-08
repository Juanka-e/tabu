import { prisma } from "@hushle/platform-db";

export interface PaymentOfferView {
    code: string;
    productKind: "cosmetic_item" | "cosmetic_bundle" | "coin_pack";
    productName: string;
    description: string | null;
    unitAmountMinor: number;
    currency: string;
}

export async function listActivePaymentOffers(now = new Date()): Promise<PaymentOfferView[]> {
    const offers = await prisma.paymentOffer.findMany({
        where: {
            isActive: true,
            AND: [
                { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
                { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
            ],
        },
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
        select: {
            code: true,
            productKind: true,
            productName: true,
            description: true,
            unitAmountMinor: true,
            currency: true,
        },
    });

    return offers;
}

export async function getActivePaymentOffer(code: string, now = new Date()) {
    return prisma.paymentOffer.findFirst({
        where: {
            code,
            isActive: true,
            AND: [
                { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
                { OR: [{ endsAt: null }, { endsAt: { gt: now } }] },
            ],
        },
    });
}
