import { expect, test } from '@playwright/test';

test.describe('Command center', () => {
  test('cmd-kpi/nodes/victims/activity present; Esc exits', async ({
    page,
  }) => {
    await page.goto('/command');
    await expect(page.getByTestId('page-command')).toBeVisible({
      timeout: 20_000,
    });

    await expect(page.getByTestId('cmd-kpi')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('cmd-nodes')).toBeVisible();
    await expect(page.getByTestId('cmd-victims')).toBeVisible();
    await expect(page.getByTestId('cmd-activity')).toBeVisible();

    await page.getByTestId('page-command').focus();
    await page.keyboard.press('Escape');
    await expect(page).toHaveURL(/\/(\?.*)?$/, { timeout: 15_000 });
    await expect(page.getByTestId('page-home')).toBeVisible({
      timeout: 15_000,
    });
  });
});
