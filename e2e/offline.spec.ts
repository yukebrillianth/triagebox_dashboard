import { expect, test } from '@playwright/test';

test.describe('Offline banner', () => {
  test('emulate offline → banner-offline visible', async ({ page, context }) => {
    await page.goto('/');
    await expect(page.getByTestId('page-home')).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId('connection-badge')).toContainText(
      'Terhubung',
      { timeout: 25_000 }
    );

    await context.setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));

    await expect(page.getByTestId('banner-offline')).toBeVisible({
      timeout: 15_000,
    });

    await context.setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
  });
});
