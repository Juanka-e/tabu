import { expect, test } from "@playwright/test";
import bcryptjs from "bcryptjs";
import { randomUUID } from "node:crypto";
import { prisma } from "@hushle/platform-db";

test.describe("admin payment operations", () => {
    const enabled = process.env.PAYMENT_OPERATIONS_ADMIN_E2E === "true";
    const suffix = randomUUID().replaceAll("-", "").slice(0, 12);
    const username = `payment_ops_${suffix}`;
    const password = `Payment-Ops-${suffix}!`;
    let adminId: number | null = null;
    let targetUserId: number | null = null;
    let orderId: string | null = null;
    let reversalId: string | null = null;

    test.skip(!enabled, "PAYMENT_OPERATIONS_ADMIN_E2E=true is required");
    test.beforeAll(async () => {
        const admin = await prisma.user.create({
            data: { username, password: await bcryptjs.hash(password, 10), role: "admin" },
        });
        adminId = admin.id;
        const target = await prisma.user.create({
            data: { username: `payment_target_${suffix}`, password: "e2e-test" },
        });
        targetUserId = target.id;
        orderId = randomUUID();
        reversalId = randomUUID();
        await prisma.paymentOrder.create({
            data: {
                id: orderId,
                userId: target.id,
                provider: "paytr",
                status: "refunded",
                idempotencyKey: `admin-payment-ops:${suffix}`,
                requestFingerprint: "e".repeat(64),
                productKind: "coin_pack",
                productReference: `coin_pack_${suffix}`,
                productVersion: 1,
                productNameSnapshot: "E2E Coin Pack",
                quantity: 1,
                unitAmountMinor: 1_000,
                totalAmountMinor: 1_000,
                currency: "TRY",
                grantSnapshot: { schemaVersion: 1, coinAmount: 100 },
                reversal: {
                    create: {
                        id: reversalId,
                        outcome: "refund",
                        status: "manual_review",
                        externalReference: `e2e-refund-${suffix}`,
                        reason: "E2E manual review",
                        evidence: {
                            kind: "coin_pack",
                            policy: "exact_payment_lot_reversal",
                            reversedCoin: 60,
                            unrecoveredCoin: 40,
                        },
                        manualReviewCase: {
                            create: {
                                reasonCode: "coin_spent_unrecovered",
                                unrecoveredCoin: 40,
                            },
                        },
                    },
                },
            },
        });
    });
    test.afterAll(async () => {
        if (targetUserId !== null) {
            await prisma.notification.deleteMany({ where: { userId: targetUserId } });
        }
        if (reversalId !== null) {
            await prisma.paymentManualReviewCase.deleteMany({ where: { reversalId } });
            await prisma.paymentReversal.deleteMany({ where: { id: reversalId } });
        }
        if (orderId !== null) {
            await prisma.paymentOrder.deleteMany({ where: { id: orderId } });
        }
        if (adminId !== null) {
            await prisma.auditLog.deleteMany({ where: { actorUserId: adminId } });
            await prisma.user.deleteMany({ where: { id: adminId } });
        }
        if (targetUserId !== null) {
            await prisma.user.deleteMany({ where: { id: targetUserId } });
        }
        await prisma.$disconnect();
    });

    test("renders the responsive fail-safe operations view", async ({ page }) => {
        await page.goto("/admin/login");
        await page.getByLabel("Kullanici Adi").fill(username);
        await page.getByLabel("Sifre").fill(password);
        await page.getByRole("button", { name: "Giris Yap" }).click();
        await page.waitForURL(/\/admin(?:\/)?$/);
        await page.goto("/admin/payments");
        await expect(page.getByRole("heading", { name: "Ödeme Operasyonları" })).toBeVisible();
        await expect(page.getByText(/Bu ekran sağlayıcıda para iadesi başlatmaz/)).toBeVisible();
        await expect(page.getByText("Açık uzlaştırma")).toBeVisible();
        await expect(page.getByText("İkinci onay bekliyor")).toBeVisible();
        await expect(page.getByText("Açık manuel inceleme")).toBeVisible();
        await expect(page.getByText("Dead-letter")).toBeVisible();
        await expect(page.getByText(/farklı bir adminin onayı zorunludur/)).toBeVisible();
        await expect(page.getByText("Açık manuel inceleme · coin_spent_unrecovered")).toBeVisible();
        await expect(page.getByText(/Bu karar bakiye, askıya alma veya ekonomi guard ayarını değiştirmez/)).toBeVisible();
        await page.getByPlaceholder("Zorunlu operasyon karar notu").fill("E2E provider kanıtı incelendi");
        await page.getByText("Oyuncuya genel bildirim gönder").click();
        await page.getByPlaceholder("Bildirim mesajı (boşsa güvenli varsayılan metin)").fill("Ödeme incelemeniz tamamlandı.");
        await page.getByPlaceholder(`Onay için reversal ID: ${reversalId}`).fill(reversalId!);
        await page.getByRole("button", { name: "İncelemeyi kapat" }).click();
        await expect(page.getByText("Manuel inceleme kararı kaydedildi.")).toBeVisible();
        await expect(page.getByText("İnceleme tamamlandı")).toBeVisible();
        await expect(page.getByText("Oyuncuya bildirim gönderildi")).toBeVisible();
        await page.setViewportSize({ width: 390, height: 844 });
        await expect(page.getByPlaceholder("Sipariş, sağlayıcı referansı veya kullanıcı ara")).toBeVisible();
    });
});
