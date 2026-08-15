import { expect, test } from '@playwright/test';

test.describe('design system and responsive shell', () => {
  test('switches theme, logo, and keeps a live WIB clock', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('app-shell')).toBeVisible();

    const themeToggle = page.getByTestId('theme-toggle');
    const initialDark = await page.evaluate(() =>
      document.documentElement.classList.contains('dark')
    );

    await themeToggle.click();
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.classList.contains('dark'))
      )
      .toBe(!initialDark);
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('triagebox.theme')))
      .toBe(initialDark ? 'light' : 'dark');

    const clock = page.getByTestId('wib-clock');
    await expect(clock).toBeVisible();
    await expect(clock).toContainText('WIB');

    // After toggle: light uses dark logo asset, dark uses light logo asset.
    const expectedLogo = initialDark
      ? '/logo-dark-transparant.png'
      : '/logo-light-transparant.png';
    const logoSrc = await page.evaluate(() => {
      const imgs = Array.from(
        document.querySelectorAll<HTMLImageElement>(
          '[data-testid="app-sidebar"] img'
        )
      );
      const visible = imgs.find(
        (img) => getComputedStyle(img).display !== 'none'
      );
      return visible?.getAttribute('src') ?? null;
    });
    expect(logoSrc).toBe(expectedLogo);
  });

  test('uses a drawer without horizontal page overflow on mobile', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByTestId('app-shell')).toBeVisible();

    const menu = page.getByTestId('menu-toggle');
    await expect(menu).toBeVisible();
    await expect(menu).toHaveAttribute('aria-expanded', 'false');

    await menu.click();
    await expect(menu).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByTestId('nav-home')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(menu).toHaveAttribute('aria-expanded', 'false');

    const noOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1
    );
    expect(noOverflow).toBe(true);
  });

  test('plays RED alert only when sound is enabled', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('mute-toggle')).toBeVisible();

    await page.evaluate(() => {
      Object.defineProperty(HTMLMediaElement.prototype, 'play', {
        configurable: true,
        value() {
          window.localStorage.setItem('triagebox.testAudioPlayed', 'true');
          return Promise.resolve();
        },
      });
      window.localStorage.setItem('triagebox.soundEnabled', 'true');
      window.localStorage.removeItem('triagebox.testAudioPlayed');
      window.dispatchEvent(new CustomEvent('triagebox:red-sound'));
    });

    await expect
      .poll(() =>
        page.evaluate(() => localStorage.getItem('triagebox.testAudioPlayed'))
      )
      .toBe('true');

    await page.getByTestId('mute-toggle').click();
    await page.evaluate(() => {
      window.localStorage.removeItem('triagebox.testAudioPlayed');
      window.dispatchEvent(new CustomEvent('triagebox:red-sound'));
    });
    await page.waitForTimeout(150);
    expect(
      await page.evaluate(() =>
        localStorage.getItem('triagebox.testAudioPlayed')
      )
    ).toBeNull();
  });

  test('prints report as an unclipped light document', async ({ page }) => {
    await page.goto('/report');
    await expect(page.getByTestId('page-report')).toBeVisible({
      timeout: 15_000,
    });
    await page.emulateMedia({ media: 'print' });

    await expect(page.getByTestId('app-sidebar')).toBeHidden();
    await expect(page.getByTestId('app-topbar')).toBeHidden();
    await expect(page.getByTestId('btn-print')).toBeHidden();

    const printState = await page.evaluate(() => {
      const shell = document.querySelector<HTMLElement>(
        '[data-testid="app-shell"]'
      );
      const body = getComputedStyle(document.body);
      const shellStyle = shell ? getComputedStyle(shell) : null;
      return {
        bodyBackground: body.backgroundColor,
        shellOverflow: shellStyle?.overflow,
        shellOverflowY: shellStyle?.overflowY,
      };
    });
    const bg = printState.bodyBackground.match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+)/
    );
    expect(bg).not.toBeNull();
    if (bg) {
      expect(Number(bg[1])).toBeGreaterThan(240);
      expect(Number(bg[2])).toBeGreaterThan(240);
      expect(Number(bg[3])).toBeGreaterThan(240);
    }
    expect(
      printState.shellOverflow === 'visible' ||
        printState.shellOverflowY === 'visible'
    ).toBe(true);
  });

  test('gives every activatable control a pointer cursor', async ({ page }) => {
    // Sweeps the interactive-heavy pages rather than trusting one component.
    for (const path of ['/', '/pasien', '/alert', '/perangkat', '/settings']) {
      await page.goto(path);
      await expect(page.getByTestId('app-shell')).toBeVisible();

      const wrong = await page.evaluate(() => {
        const out: {
          tag: string;
          testid?: string;
          text: string;
          got: string;
          want: string;
        }[] = [];
        const selector =
          'button, a[href], [role="button"], select, summary,' +
          ' input[type="checkbox"], input[type="radio"], label';
        for (const el of document.querySelectorAll<HTMLElement>(selector)) {
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') continue;
          // A label only counts as activatable when it wraps a toggle; labels
          // for text inputs keep the default cursor.
          if (
            el.tagName === 'LABEL' &&
            !el.querySelector('input[type="checkbox"], input[type="radio"]')
          ) {
            continue;
          }
          const disabled = (el as HTMLButtonElement).disabled === true;
          const want = disabled ? 'not-allowed' : 'pointer';
          if (cs.cursor !== want) {
            out.push({
              tag: el.tagName,
              testid: el.dataset.testid,
              text: (el.textContent ?? '').trim().slice(0, 24),
              got: cs.cursor,
              want,
            });
          }
        }
        return out;
      });

      expect(wrong, `wrong cursor on ${path}`).toEqual([]);
    }
  });
});
