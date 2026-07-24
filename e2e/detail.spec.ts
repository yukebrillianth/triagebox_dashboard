import { expect, test } from '@playwright/test';

import { getFirstVictimId } from './helpers';

test.describe('Detail pasien', () => {
  test('form renders and PATCH save', async ({ page }) => {
    const id = await getFirstVictimId(page);
    await page.goto(`/pasien/${id}`);
    await expect(page.getByTestId('page-pasien-detail')).toBeVisible();

    const nameInput = page.getByTestId('input-name');
    await expect(nameInput).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId('input-age')).toBeVisible();
    await expect(page.getByTestId('select-gender')).toBeVisible();
    await expect(page.getByTestId('input-notes')).toBeVisible();
    await expect(page.getByTestId('btn-save-registrasi')).toBeVisible();

    const stamp = `E2E ${Date.now()}`;
    await nameInput.fill(stamp);

    const patchPromise = page.waitForResponse(
      (r) =>
        r.url().includes(`/api/victims/${id}`) &&
        r.request().method() === 'PATCH' &&
        r.ok()
    );
    await page.getByTestId('btn-save-registrasi').click();
    await patchPromise;

    await expect(nameInput).toHaveValue(stamp, { timeout: 10_000 });
  });
});
