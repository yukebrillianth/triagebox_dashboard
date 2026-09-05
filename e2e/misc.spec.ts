import { expect, test } from '@playwright/test';

test.describe('Report / Settings / Status / Analytics / Perangkat', () => {
  test('report page renders with btn-print', async ({ page }) => {
    await page.goto('/report');
    await expect(page.getByTestId('page-report')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId('btn-print')).toBeVisible({
      timeout: 15_000,
    });
  });

  test('settings form renders and saves hospital_name', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.getByTestId('page-settings')).toBeVisible();
    await expect(page.getByTestId('settings-form')).toBeVisible({
      timeout: 15_000,
    });

    const hospital = page.getByTestId('input-hospital');
    await expect(hospital).toBeVisible();
    const stamp = `RS E2E ${Date.now()}`;
    await hospital.fill(stamp);

    const patchPromise = page.waitForResponse(
      (r) =>
        r.url().includes('/api/settings') &&
        (r.request().method() === 'PATCH' ||
          r.request().method() === 'PUT' ||
          r.request().method() === 'POST') &&
        r.ok()
    );
    await page.getByTestId('btn-save-settings').click();
    await patchPromise;
    await expect(hospital).toHaveValue(stamp, { timeout: 10_000 });
  });

  test('status page health-db and health-mqtt', async ({ page }) => {
    await page.goto('/status');
    await expect(page.getByTestId('page-status')).toBeVisible();
    await expect(page.getByTestId('health-db')).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId('health-mqtt')).toBeVisible();
  });

  test('analytics page renders', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page.getByTestId('page-analytics')).toBeVisible({
      timeout: 15_000,
    });
  });

  test('perangkat page renders and tabs switch', async ({ page }) => {
    await page.goto('/perangkat');
    await expect(page.getByTestId('page-perangkat')).toBeVisible({
      timeout: 15_000,
    });

    await expect(page.getByTestId('tab-station')).toBeVisible();
    await expect(page.getByTestId('tab-node')).toBeVisible();

    // There is no "+ Node" / "+ Station": ids come from station adoption, so
    // the node tab's only control is the station filter.
    await page.getByTestId('tab-node').click();
    await expect(page.getByTestId('filter-node-station')).toBeVisible({
      timeout: 5_000,
    });

    await page.getByTestId('tab-station').click();
    await expect(page.getByTestId('tab-station')).toHaveAttribute(
      'data-active',
      'true'
    );
  });
});
