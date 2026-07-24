import { expect, test } from '@playwright/test';

test.describe('Alert', () => {
  test('page renders and ack button present for unacked', async ({ page }) => {
    await page.goto('/alert');
    await expect(page.getByTestId('page-alert')).toBeVisible({
      timeout: 20_000,
    });

    await expect(
      page.getByTestId('btn-ack').or(page.getByTestId('empty-state')).first()
    ).toBeVisible({ timeout: 20_000 });

    const ackCount = await page.getByTestId('btn-ack').count();
    if (ackCount > 0) {
      await expect(page.getByTestId('btn-ack').first()).toBeVisible();
    }
  });
});
