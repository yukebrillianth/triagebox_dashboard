'use client';

import { useQuery, type UseQueryOptions } from '@tanstack/react-query';

import { api } from '@/lib/api';
import type {
  Activity,
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
  Settings,
  Station,
  Victim,
} from '@/types';

export const queryKeys = {
  kpis: ['kpis'] as const,
  victims: {
    all: ['victims'] as const,
    list: (params?: ListVictimsParams) =>
      [...queryKeys.victims.all, 'list', params ?? {}] as const,
    detail: (id: string) => [...queryKeys.victims.all, 'detail', id] as const,
    vitals: (id: string) => [...queryKeys.victims.all, 'vitals', id] as const,
    triageHistory: (id: string) =>
      [...queryKeys.victims.all, 'triageHistory', id] as const,
  },
  nodes: {
    all: ['nodes'] as const,
    list: (params?: ListNodesParams) =>
      [...queryKeys.nodes.all, 'list', params ?? {}] as const,
    detail: (id: string) => [...queryKeys.nodes.all, 'detail', id] as const,
  },
  stations: {
    all: ['stations'] as const,
    list: (params?: ListStationsParams) =>
      [...queryKeys.stations.all, 'list', params ?? {}] as const,
    detail: (id: string) => [...queryKeys.stations.all, 'detail', id] as const,
  },
  alerts: {
    all: ['alerts'] as const,
    list: (params?: ListAlertsParams) =>
      [...queryKeys.alerts.all, 'list', params ?? {}] as const,
  },
  activity: (params?: ListActivityParams) =>
    ['activity', params ?? {}] as const,
  analytics: ['analytics'] as const,
  settings: ['settings'] as const,
  health: ['health'] as const,
  report: ['report'] as const,
};

type QO<T> = Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>;

export function useKpis(options?: QO<Kpi>) {
  return useQuery({
    queryKey: queryKeys.kpis,
    queryFn: () => api.getKpis(),
    ...options,
  });
}

export function useVictims(params?: ListVictimsParams, options?: QO<Victim[]>) {
  return useQuery({
    queryKey: queryKeys.victims.list(params),
    queryFn: () => api.listVictims(params),
    ...options,
  });
}

export function useVictim(id: string, options?: QO<Victim>) {
  return useQuery({
    queryKey: queryKeys.victims.detail(id),
    queryFn: () => api.getVictim(id),
    enabled: Boolean(id),
    ...options,
  });
}

export function useNodes(params?: ListNodesParams, options?: QO<Node[]>) {
  return useQuery({
    queryKey: queryKeys.nodes.list(params),
    queryFn: () => api.listNodes(params),
    ...options,
  });
}

export function useNode(id: string, options?: QO<Node>) {
  return useQuery({
    queryKey: queryKeys.nodes.detail(id),
    queryFn: () => api.getNode(id),
    enabled: Boolean(id),
    ...options,
  });
}

export function useStations(
  params?: ListStationsParams,
  options?: QO<Station[]>
) {
  return useQuery({
    queryKey: queryKeys.stations.list(params),
    queryFn: () => api.listStations(params),
    ...options,
  });
}

export function useStation(id: string, options?: QO<Station>) {
  return useQuery({
    queryKey: queryKeys.stations.detail(id),
    queryFn: () => api.getStation(id),
    enabled: Boolean(id),
    ...options,
  });
}

export function useAlerts(params?: ListAlertsParams, options?: QO<Alert[]>) {
  return useQuery({
    queryKey: queryKeys.alerts.list(params),
    queryFn: () => api.listAlerts(params),
    ...options,
  });
}

export function useActivity(
  params?: ListActivityParams,
  options?: QO<Activity[]>
) {
  return useQuery({
    queryKey: queryKeys.activity(params),
    queryFn: () => api.getActivity(params),
    ...options,
  });
}

export function useAnalytics(options?: QO<AnalyticsSummary>) {
  return useQuery({
    queryKey: queryKeys.analytics,
    queryFn: () => api.getAnalytics(),
    ...options,
  });
}

export function useSettings(options?: QO<Settings>) {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => api.getSettings(),
    ...options,
  });
}

export function useHealth(options?: QO<Health>) {
  return useQuery({
    queryKey: queryKeys.health,
    queryFn: () => api.getHealth(),
    ...options,
  });
}
