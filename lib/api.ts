// Data fetching: React Query (not SWR) — see providers/QueryProvider + hooks/use-api.
import type {
  Activity,
  AdoptStationInput,
  Alert,
  AnalyticsSummary,
  Health,
  Kpi,
  ListActivityParams,
  ListAlertsParams,
  ListNodesParams,
  ListStationsParams,
  ListVictimsParams,
  Node,
  OverrideVictimInput,
  PendingStation,
  ReportSummary,
  Settings,
  Station,
  TriageHistory,
  UpdateStationInput,
  UpdateVictimInput,
  Victim,
  VitalReading,
} from '@/types';

import { getApiBaseUrl } from './config';
import { HttpError } from './http-error';

const DEFAULT_TIMEOUT = 15_000;

type NextFetchOptions = {
  revalidate?: number | false;
  tags?: string[];
};

type ApiFetchOptions = RequestInit & {
  next?: NextFetchOptions;
  timeout?: number;
};

function toQuery(
  params?: Record<string, string | number | boolean | undefined | null>
): string {
  if (!params) return '';
  const sp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    sp.set(key, String(value));
  }
  const q = sp.toString();
  return q ? `?${q}` : '';
}

/**
 * Typed fetch wrapper with 15s timeout and HttpError on non-ok.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { next, timeout = DEFAULT_TIMEOUT, headers, ...fetchOptions } = options;

  const url = path.startsWith('http') ? path : `${getApiBaseUrl()}${path}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const init: RequestInit & { next?: NextFetchOptions } = {
    ...fetchOptions,
    signal: controller.signal,
    headers: {
      Accept: 'application/json',
      ...(fetchOptions.body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
  };

  if (next) {
    init.next = next;
  }

  try {
    const response = await fetch(url, init);
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      if (
        data &&
        typeof data === 'object' &&
        data !== null &&
        'errors' in data
      ) {
        const err = new HttpError(
          response.status,
          response.statusText,
          data,
          'Validation error'
        );
        err.validationErrors = (
          data as { errors: Record<string, { field: string; message: string }> }
        ).errors;
        throw err;
      }
      // Prefer `message` over `error`: Nest puts the specific reason in
      // `message` ("Station 'st-09' or one of its node ids already exists") and
      // only the status name in `error` ("Conflict"), which tells the operator
      // nothing they can act on. class-validator sends `message` as an array.
      const body = data as {
        error?: string;
        message?: string | string[];
      } | null;
      const raw =
        data && typeof data === 'object' && body
          ? (body.message ?? body.error)
          : undefined;
      const msg = Array.isArray(raw) ? raw.join('. ') : raw;
      throw new HttpError(
        response.status,
        response.statusText,
        data,
        msg || `Request failed with status ${response.status}`
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof HttpError) throw error;

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new HttpError(0, 'Timeout', null, 'Request timed out');
    }

    if (error instanceof TypeError) {
      throw new HttpError(
        0,
        'Network Error',
        null,
        'Failed to connect to server'
      );
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export const api = {
  getKpis(): Promise<Kpi> {
    return apiFetch<Kpi>('/api/kpis');
  },

  listVictims(params?: ListVictimsParams): Promise<Victim[]> {
    return apiFetch<Victim[]>(`/api/victims${toQuery(params)}`);
  },

  overrideVictim(id: string, body: OverrideVictimInput): Promise<Victim> {
    return apiFetch<Victim>(`/api/victims/${encodeURIComponent(id)}/override`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  getVictim(id: string): Promise<Victim> {
    return apiFetch<Victim>(`/api/victims/${encodeURIComponent(id)}`);
  },

  patchVictim(id: string, body: UpdateVictimInput): Promise<Victim> {
    return apiFetch<Victim>(`/api/victims/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  getVictimVitals(id: string, limit?: number): Promise<VitalReading[]> {
    return apiFetch<VitalReading[]>(
      `/api/victims/${encodeURIComponent(id)}/vitals${toQuery({ limit })}`
    );
  },

  getVictimTriageHistory(id: string): Promise<TriageHistory[]> {
    return apiFetch<TriageHistory[]>(
      `/api/victims/${encodeURIComponent(id)}/triage-history`
    );
  },

  listNodes(params?: ListNodesParams): Promise<Node[]> {
    return apiFetch<Node[]>(
      `/api/nodes${toQuery({
        stationId: params?.stationId,
        status: params?.status,
        includeInactive:
          params?.includeInactive === undefined
            ? undefined
            : params.includeInactive
              ? 'true'
              : 'false',
      })}`
    );
  },

  listStations(params?: ListStationsParams): Promise<Station[]> {
    return apiFetch<Station[]>(
      `/api/stations${toQuery({
        includeInactive:
          params?.includeInactive === undefined
            ? undefined
            : params.includeInactive
              ? 'true'
              : 'false',
      })}`
    );
  },

  patchStation(id: string, body: UpdateStationInput): Promise<Station> {
    return apiFetch<Station>(`/api/stations/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },

  deleteStation(id: string): Promise<Station> {
    return apiFetch<Station>(`/api/stations/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },

  listPendingStations(): Promise<PendingStation[]> {
    return apiFetch<PendingStation[]>('/api/stations/pending');
  },

  adoptStation(body: AdoptStationInput): Promise<Station> {
    return apiFetch<Station>('/api/stations/adopt', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  dismissPendingStation(mac: string): Promise<PendingStation> {
    return apiFetch<PendingStation>(
      `/api/stations/pending/${encodeURIComponent(mac)}`,
      { method: 'DELETE' }
    );
  },

  listAlerts(params?: ListAlertsParams): Promise<Alert[]> {
    return apiFetch<Alert[]>(
      `/api/alerts${toQuery({
        severity: params?.severity,
        acked:
          params?.acked === undefined
            ? undefined
            : params.acked
              ? 'true'
              : 'false',
        limit: params?.limit,
      })}`
    );
  },

  ackAlert(id: string): Promise<Alert> {
    return apiFetch<Alert>(`/api/alerts/${encodeURIComponent(id)}/ack`, {
      method: 'POST',
    });
  },

  getActivity(params?: ListActivityParams): Promise<Activity[]> {
    return apiFetch<Activity[]>(`/api/activity${toQuery(params)}`);
  },

  getAnalytics(): Promise<AnalyticsSummary> {
    return apiFetch<AnalyticsSummary>('/api/analytics/summary');
  },

  getSettings(): Promise<Settings> {
    return apiFetch<Settings>('/api/settings');
  },

  putSettings(body: Settings): Promise<Settings> {
    return apiFetch<Settings>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },

  getHealth(): Promise<Health> {
    return apiFetch<Health>('/api/health');
  },

  getReportSummary(): Promise<ReportSummary> {
    return apiFetch<ReportSummary>('/api/reports/summary');
  },
};
