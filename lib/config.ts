import { env } from './env';

const DEFAULT_API_URL = 'http://localhost:3001';
const DEFAULT_APP_URL = 'http://localhost:3000';

export function getApiBaseUrl(): string {
  return env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
}

export function getAppUrl(): string {
  return env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL;
}
