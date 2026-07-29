import { expect, test } from "@playwright/test";

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
      )
    )
    .toBe(true);
}

test("home page renders primary lobby actions", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: /Yeni Oda Olustur/i })).toBeVisible();
  await expect(page.getByPlaceholder(/Adinizi girin/i)).toBeVisible();
  await expect(page.getByPlaceholder(/ABC123|Orn: ABC123/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /Duyurulari ac/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /Temayi degistir/i })).toBeVisible();
});

test("home page validates guest identity before room actions", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("button", { name: /Yeni Oda Olustur/i })).toBeDisabled();
  await page.getByPlaceholder(/Adinizi girin/i).fill("Launch Guest");
  await expect(page.getByRole("button", { name: /Yeni Oda Olustur/i })).toBeEnabled();
  await expect(page.getByRole("button", { name: /^Katil$/i })).toBeDisabled();
});

test("announcements modal opens and closes accessibly", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: /Duyurulari ac/i }).click();
  await expect(page.getByRole("heading", { name: /Yenilikler/i })).toBeVisible();
  await page.getByRole("button", { name: /Duyurulari kapat/i }).click();
  await expect(page.getByRole("heading", { name: /Yenilikler/i })).toBeHidden();
});

test("login page renders credentials form", async ({ page }) => {
  await page.goto("/login");

  await expect(page.getByRole("button", { name: /Giris Yap/i })).toBeVisible();
  await expect(page.getByPlaceholder(/Kullanici Adi/i)).toBeVisible();
  await expect(page.getByPlaceholder(/Sifre/i)).toBeVisible();
});

test("register page renders complete account form", async ({ page }) => {
  await page.goto("/register");

  await expect(page.getByRole("button", { name: /Kayit Ol/i })).toBeVisible();
  await expect(page.getByPlaceholder(/Kullanici Adi/i)).toBeVisible();
  await expect(page.getByPlaceholder(/E-posta/i)).toBeVisible();
  await expect(page.getByPlaceholder(/Sifre/i)).toBeVisible();
});

test("room page prompts guest username before joining", async ({ page }) => {
  await page.goto("/room/ABC123");

  await expect(page.locator("input[type='text']")).toBeVisible({ timeout: 15_000 });
});

test.describe("mobile web launch surfaces", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  for (const path of ["/", "/login", "/register", "/room/ABC123"]) {
    test(`${path} has no horizontal page overflow`, async ({ page }) => {
      await page.goto(path);
      await expectNoHorizontalOverflow(page);
    });
  }
});
