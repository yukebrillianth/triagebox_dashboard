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

    // The two honesty labels this table now carries: RR is the operator's band,
    // not a microphone reading, and every row's ESI reads 1-5 or "-" (the model
    // did not score) — never 0, which is not a class the scale has.
    await expect(
      page.getByRole('columnheader', { name: 'RR (operator)' })
    ).toBeVisible();
    await expect(rows.first().getByTestId('esi-chip')).toHaveText(
      /^ESI (?:[1-5]|-)$/
    );

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
