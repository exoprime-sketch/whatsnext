import { expect, test } from '@playwright/test';

const MOBILE_VIEWPORT = { width: 393, height: 852 };
const APP_URL = 'http://localhost:4173';

test.use({ viewport: MOBILE_VIEWPORT });

const INPUT_1 = `Meeting notes: Please send the revised report by Friday.
Also check the budget numbers tomorrow morning and prepare slides for next week's review.`;

const INPUT_2 = `Dinner with Mina on Saturday at 7 PM near Gangnam Station.
Don't forget to book a table before Friday.`;

const INPUT_3 = `Can you reply to John today, submit the draft by tomorrow, and call Alex at 3 PM to confirm the schedule?`;

async function pasteAndExtract(page: import('@playwright/test').Page, text: string) {
  await page.locator('textarea').fill(text);
  await page.getByRole('button', { name: 'Extract' }).click();
}

test('input 1 — meeting notes', async ({ page }) => {
  await page.goto(APP_URL);
  await page.screenshot({ path: 'tests/e2e/screenshots/input1-start.png' });

  await pasteAndExtract(page, INPUT_1);
  await page.screenshot({ path: 'tests/e2e/screenshots/input1-extracted.png' });

  await expect(page.getByText(/send the revised report/i)).toBeVisible();
  await expect(page.getByText(/check the budget numbers/i)).toBeVisible();
  await expect(page.getByText(/prepare slides/i)).toBeVisible();

  await page.getByRole('button', { name: 'Save selected' }).click();
  await page.screenshot({ path: 'tests/e2e/screenshots/input1-saved.png' });

  await page.getByRole('button', { name: 'Upcoming' }).click();
  await page.screenshot({ path: 'tests/e2e/screenshots/input1-upcoming.png' });

  const upcomingContent = page.locator('.upcoming-group, .panel--quiet, .task-card');
  await expect(upcomingContent.first()).toBeVisible();
});

test('input 2 — dinner with Mina', async ({ page }) => {
  await page.goto(APP_URL);

  await pasteAndExtract(page, INPUT_2);
  await page.screenshot({ path: 'tests/e2e/screenshots/input2-extracted.png' });

  await expect(page.getByText(/dinner with mina/i)).toBeVisible();
  await expect(page.getByText(/book a table/i)).toBeVisible();

  await page.getByRole('button', { name: 'Save selected' }).click();

  await page.getByRole('button', { name: 'Upcoming' }).click();
  await page.screenshot({ path: 'tests/e2e/screenshots/input2-upcoming.png' });

  const upcomingContent = page.locator('.task-card');
  await expect(upcomingContent.first()).toBeVisible();
});

test('input 3 — reply, submit, call Alex', async ({ page }) => {
  await page.goto(APP_URL);

  await pasteAndExtract(page, INPUT_3);
  await page.screenshot({ path: 'tests/e2e/screenshots/input3-extracted.png' });

  await expect(page.getByText(/reply to john/i)).toBeVisible();
  await expect(page.getByText(/submit the draft/i)).toBeVisible();
  await expect(page.getByText(/call alex/i)).toBeVisible();

  await page.getByRole('button', { name: 'Save selected' }).click();

  await page.getByRole('button', { name: 'Upcoming' }).click();
  await page.screenshot({ path: 'tests/e2e/screenshots/input3-upcoming.png' });

  const taskCards = page.locator('.task-card');
  await expect(taskCards.first()).toBeVisible();
});

test('bottom nav stays fixed when scrolling', async ({ page }) => {
  await page.goto(APP_URL);

  const bottomNav = page.locator('.bottom-nav');
  await expect(bottomNav).toBeVisible();

  const navBox = await bottomNav.boundingBox();
  expect(navBox).not.toBeNull();

  await page.evaluate(() => window.scrollTo(0, 500));
  await page.waitForTimeout(200);

  const navBoxAfterScroll = await bottomNav.boundingBox();
  expect(navBoxAfterScroll?.y).toBeCloseTo(navBox!.y, 5);

  await page.screenshot({ path: 'tests/e2e/screenshots/nav-fixed.png' });
});

test('no horizontal scroll', async ({ page }) => {
  await page.goto(APP_URL);
  const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2);
});

test('capture is the default screen', async ({ page }) => {
  await page.goto(APP_URL);
  await expect(page.locator('textarea')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Extract' })).toBeVisible();
  await page.screenshot({ path: 'tests/e2e/screenshots/default-screen.png' });
});

test('no Korean in visible UI', async ({ page }) => {
  await page.goto(APP_URL);
  const bodyText = await page.locator('body').textContent();
  const hangul = /[ᄀ-ᇿ㄰-㆏가-힯]/u;
  expect(hangul.test(bodyText ?? '')).toBe(false);
});
