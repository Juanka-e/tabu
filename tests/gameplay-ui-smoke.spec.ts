import { expect, test } from "@playwright/test";

test("home page renders primary lobby actions", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: /Yeni Oda Olustur/i })).toBeVisible();
  await expect(page.getByPlaceholder(/Adinizi girin/i)).toBeVisible();
  await expect(page.getByPlaceholder(/ABC123|Orn: ABC123/i)).toBeVisible();
});

test("login page renders credentials form", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("button", { name: /Giris Yap/i })).toBeVisible();
  await expect(page.getByPlaceholder(/Kullanici Adi/i)).toBeVisible();
  await expect(page.getByPlaceholder(/Sifre/i)).toBeVisible();
});

test("room page prompts guest username before joining", async ({ page }) => {
  await page.goto("/room/ABC123");

  await expect(page.locator("input[type='text']")).toBeVisible({ timeout: 15_000 });
});
