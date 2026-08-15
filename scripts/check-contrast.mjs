/**
 * Asserts every color token pair in app/globals.css meets WCAG 2.1 AA:
 * 4.5:1 for text, 3:1 for non-text (focus ring, solid fills).
 *
 * Tokens are parsed from the stylesheet so this cannot drift from the source of
 * truth. Composited cases matter as much as flat ones: a `bg-triage-red/12`
 * pill puts red text on a red-tinted card, which is dimmer than red on card.
 *
 * Run: node scripts/check-contrast.mjs
 */
import { readFileSync } from 'node:fs';

const CSS = readFileSync(
  new URL('../app/globals.css', import.meta.url),
  'utf8'
);

/** Pulls `--name: #hex;` pairs out of one rule block. */
function tokens(selector) {
  const start = CSS.indexOf(selector);
  if (start === -1) throw new Error(`selector not found: ${selector}`);
  const open = CSS.indexOf('{', start);
  const block = CSS.slice(open, CSS.indexOf('}', open));
  const out = {};
  for (const [, k, v] of block.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    out[k] = v.toLowerCase();
  }
  return out;
}

const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (c) =>
  c / 255 <= 0.03928
    ? c / 255 / 12.92
    : Math.pow((c / 255 + 0.055) / 1.055, 2.4);
const lum = (h) => {
  const [r, g, b] = rgb(h);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

function ratio(fg, bg) {
  const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
}

/** Tailwind's `bg-x/NN` composites the color over whatever is behind it. */
function over(fg, bg, alpha) {
  const f = rgb(fg);
  const b = rgb(bg);
  return (
    '#' +
    [0, 1, 2]
      .map((i) =>
        Math.round(f[i] * alpha + b[i] * (1 - alpha))
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}

const fails = [];
function assert(theme, label, fg, bg, min) {
  const r = ratio(fg, bg);
  if (r < min) fails.push({ theme, label, r, min });
  return r;
}

/** Surfaces any text can land on. */
const SURFACES = [
  'background',
  'card',
  'surface-header',
  'surface-input',
  'chip',
  'surface-sidebar',
  'control-hover',
];

/** Tint alphas actually used in the codebase, and what they sit on. */
const TINTS = [
  [0.15, 'surface-header'],
  [0.15, 'card'],
  [0.15, 'background'],
  [0.12, 'card'],
  [0.1, 'card'],
  [0.09, 'card'],
];

function audit(theme, T) {
  const inkFor = { red: T['triage-red-ink'] };
  const tones = ['triage-red', 'triage-yellow', 'triage-green', 'triage-black'];

  // Body text on every surface.
  for (const s of SURFACES) {
    for (const t of ['foreground', 'foreground-soft', 'muted', 'dim']) {
      assert(theme, `${t} on ${s}`, T[t], T[s], 4.5);
    }
  }

  // Tone colors used as text, flat and over their own tint.
  for (const tone of tones) {
    const ink = tone === 'triage-red' ? inkFor.red : T[tone];
    for (const s of ['background', 'card', 'surface-header', 'chip']) {
      assert(theme, `${tone} ink on ${s}`, ink, T[s], 4.5);
    }
    for (const [a, base] of TINTS) {
      const bg = over(T[tone], T[base], a);
      assert(theme, `${tone} ink on ${tone}/${a * 100} over ${base}`, ink, bg, 4.5); // prettier-ignore
    }
  }
  assert(theme, 'accent ink on accent/15 over surface-header', T.accent, over(T.accent, T['surface-header'], 0.15), 4.5); // prettier-ignore

  // Neutral text over the tinted RED tile on Beranda.
  const tile = over(T['triage-red'], T.card, 0.09);
  assert(theme, 'foreground on red/9 tile', T.foreground, tile, 4.5);
  assert(theme, 'muted on red/9 tile', T.muted, tile, 4.5);

  // Text on solid fills.
  assert(theme, 'white on red fill', '#ffffff', T['triage-red'], 4.5);
  assert(theme, 'accent-foreground on accent', T['accent-foreground'], T.accent, 4.5); // prettier-ignore

  // Non-text (1.4.11): fills and the focus ring must be distinguishable.
  assert(theme, 'red fill vs page (non-text)', T['triage-red'], T.background, 3); // prettier-ignore
  assert(theme, 'focus ring vs page (non-text)', T.focus, T.background, 3);
  assert(theme, 'focus ring vs card (non-text)', T.focus, T.card, 3);
}

audit('light', tokens(':root'));
audit('dark', tokens('html.dark'));

if (fails.length) {
  console.error(`${fails.length} contrast failure(s):`);
  for (const f of fails.sort((a, b) => a.r - b.r)) {
    console.error(`  ${f.r.toFixed(2)} < ${f.min}  [${f.theme}] ${f.label}`);
  }
  process.exit(1);
}
process.stdout.write(
  'contrast OK — AA for text (4.5:1) and non-text (3:1), both themes\n'
);
