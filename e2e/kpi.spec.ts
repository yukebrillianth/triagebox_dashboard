import { expect, test } from '@playwright/test';

test.describe('Beranda KPI', () => {
  test('bootstrap KPI live render — kpi-total visible and > 0', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page.getByTestId('page-home')).toBeVisible({
      timeout: 20_000,
    });

    const kpiTotal = page.getByTestId('kpi-total');
    await expect(kpiTotal).toBeVisible({ timeout: 20_000 });

    await expect
      .poll(
        async () => {
          const text = (await kpiTotal.textContent())?.trim() ?? '0';
          return Number.parseInt(text, 10);
        },
        { timeout: 20_000 }
      )
      .toBeGreaterThan(0);

    await expect(page.getByTestId('kpi-red')).toBeVisible();
    await expect(page.getByTestId('kpi-yellow')).toBeVisible();
    await expect(page.getByTestId('kpi-green')).toBeVisible();
    await expect(page.getByTestId('kpi-black')).toBeVisible();
  });
});
