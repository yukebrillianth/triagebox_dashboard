import { expect, test } from '@playwright/test';

test.describe('Daftar pasien', () => {
  test('table rows, filter-search, priority chips', async ({ page }) => {
    await page.goto('/pasien');
    await expect(page.getByTestId('page-pasien')).toBeVisible();

    await expect(page.getByTestId('filter-search')).toBeVisible({
      timeout: 15_000,
    });

    for (const p of ['RED', 'YELLOW', 'GREEN', 'BLACK'] as const) {
      await expect(page.getByTestId(`filter-priority-${p}`)).toBeVisible();
    }

    const rows = page.locator('[data-testid^="victim-row-"]');
    await expect(rows.first()).toBeVisible({ timeout: 15_000 });
    expect(await rows.count()).toBeGreaterThan(0);

    await page.getByTestId('filter-search').fill('zzzz-no-match-xyz');
    await expect(page.getByTestId('empty-state')).toBeVisible({
      timeout: 5_000,
    });

    await page.getByTestId('filter-search').fill('');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });

    await page.getByTestId('filter-priority-RED').click();
    await expect(page.getByTestId('filter-priority-RED')).toHaveAttribute(
      'data-active',
      'true'
    );
  });
});
