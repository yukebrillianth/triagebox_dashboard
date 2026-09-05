import { env } from './env';

const DEFAULT_API_URL = 'http://localhost:3001';

export function getApiBaseUrl(): string {
  return env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
}
