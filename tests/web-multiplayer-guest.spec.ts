import { expect, test, type Page } from "@playwright/test";

test.skip(
  process.env.WEB_MULTIPLAYER_E2E !== "true",
  "WEB_MULTIPLAYER_E2E=true is required for the seeded multiplayer flow"
);

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1
      )
    )
    .toBe(true);
}

test("two guests join opposite teams and enter the first transition", async ({
  browser,
  page: hostPage,
}, testInfo) => {
  const checkpoint = (message: string): void => {
    console.log(`[multiplayer:${testInfo.project.name}] ${message}`);
  };
  const suffix = `${testInfo.project.name}-${Date.now()}`.replaceAll(/[^a-z0-9]/gi, "").slice(-10);
  const hostName = `Host${suffix}`;
  const guestName = `Guest${suffix}`;
  const hostErrors = collectPageErrors(hostPage);
  const guestContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: testInfo.project.name.startsWith("webkit"),
  });
  const guestPage = await guestContext.newPage();
  const guestErrors = collectPageErrors(guestPage);

  try {
    let roomCode: string | undefined;

    await test.step("host creates a room", async () => {
      await hostPage.goto("/");
      await hostPage.getByPlaceholder(/Adinizi girin/i).fill(hostName);
      await hostPage.getByRole("button", { name: /Yeni Oda Olustur/i }).click();
      await expect(hostPage).toHaveURL(/\/room\/[A-Z0-9]{6}$/, {
        timeout: 20_000,
      });

      roomCode = new URL(hostPage.url()).pathname.split("/").at(-1);
      expect(roomCode).toMatch(/^[A-Z0-9]{6}$/);
      await expect(hostPage.getByText(hostName, { exact: true }).first()).toBeVisible({
        timeout: 20_000,
      });
      checkpoint(`room ${roomCode} created`);
    });

    await test.step("second guest joins the room", async () => {
      await guestPage.goto(`/room/${roomCode}`);
      const guestNameInput = guestPage.locator("input[autofocus]");
      await expect(guestNameInput).toBeVisible({ timeout: 20_000 });
      await guestNameInput.fill(guestName);
      await guestPage.getByRole("button", { name: /Oyuna Kat/i }).click();

      await expect(hostPage.getByText(guestName, { exact: true }).first()).toBeVisible({
        timeout: 20_000,
      });
      await expect(guestPage.getByRole("button", { name: /Kategoriler/i })).toBeVisible({
        timeout: 20_000,
      });
      await expectNoHorizontalOverflow(guestPage);
      checkpoint(`${guestName} joined`);
    });

    await test.step("host starts the game", async () => {
      const startButton = hostPage.getByRole("button", { name: /Oyunu Ba/i });
      await expect(startButton).toBeEnabled({ timeout: 20_000 });
      await startButton.click();

      await expect(hostPage.getByRole("heading", { name: /Oyun ba/i })).toBeVisible({
        timeout: 20_000,
      });
      await expect(guestPage.getByRole("heading", { name: /Oyun ba/i })).toBeVisible({
        timeout: 20_000,
      });
      await expectNoHorizontalOverflow(guestPage);
      checkpoint("first transition visible to both guests");
    });

    await test.step("host pauses the transition for both guests", async () => {
      await hostPage.getByRole("button", { name: /^Durdur$/i }).click();
      await expect(hostPage.getByRole("button", { name: /Devam Ettir/i })).toBeVisible({
        timeout: 20_000,
      });
      await expect(guestPage.getByText(/bekletildi/i)).toBeVisible({
        timeout: 20_000,
      });
      checkpoint("pause synchronized");
    });

    expect(hostErrors).toEqual([]);
    expect(guestErrors).toEqual([]);
  } finally {
    await guestContext.close();
  }
});
