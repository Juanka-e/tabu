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

    test.skip(!enabled, "PAYMENT_OPERATIONS_ADMIN_E2E=true is required");
    test.beforeAll(async () => {
        const admin = await prisma.user.create({
            data: { username, password: await bcryptjs.hash(password, 10), role: "admin" },
        });
        adminId = admin.id;
    });
    test.afterAll(async () => {
        if (adminId !== null) {
            await prisma.auditLog.deleteMany({ where: { actorUserId: adminId } });
            await prisma.user.deleteMany({ where: { id: adminId } });
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
        await expect(page.getByText("Dead-letter")).toBeVisible();
        await page.setViewportSize({ width: 390, height: 844 });
        await expect(page.getByPlaceholder("Sipariş, sağlayıcı referansı veya kullanıcı ara")).toBeVisible();
    });
});
