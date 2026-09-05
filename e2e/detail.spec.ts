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

    // RR is back, but only as what it is: the band the operator tapped on the
    // device. The label is the assertion — a bare "RR" would claim a microphone
    // that is not fitted. ESI sits with the priority badge because the device
    // collapses ESI 3/4/5 into GREEN; "ESI -" is a model that did not score.
    await expect(page.getByTestId('vital-rr')).toContainText('RR (operator)');
    await expect(page.getByTestId('esi-chip').first()).toHaveText(
      /^ESI (?:[1-5]|-)$/
    );

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
