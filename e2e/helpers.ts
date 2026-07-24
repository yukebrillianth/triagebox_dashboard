import type { Page } from '@playwright/test';

const API = process.env.API_URL ?? 'http://localhost:3001';

export async function getFirstVictimId(page: Page): Promise<string> {
  const res = await page.request.get(`${API}/api/victims`);
  if (!res.ok()) throw new Error(`GET /api/victims → ${res.status()}`);
  const list = (await res.json()) as { id: string }[];
  const id = list[0]?.id;
  if (!id) throw new Error('No victims seeded on backend');
  return id;
}
