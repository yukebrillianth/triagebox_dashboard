'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import toast from 'react-hot-toast';

import { useQueryClient, type QueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/hooks/use-api';
import { api } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import type {
  Activity,
  Alert,
  Kpi,
  Node,
  Station,
  VictimRow,
  WsActivityCreated,
  WsAlertCreated,
  WsEventMap,
  WsKpiUpdated,
  WsNodeStatus,
  WsPriorityChanged,
  WsStationStatus,
  WsVictimCreated,
  WsVictimUpdated,
  WsVitalUpdated,
} from '@/types';

const SOUND_LS_KEY = 'triagebox.soundEnabled';
const FLASH_MS = 1500;
const RED_SOUND_COOLDOWN_MS = 3000;
const ACTIVITY_CAP = 50;

export type ConnectionStatus = 'connected' | 'connecting' | 'offline';

export type RealtimeContextValue = {
  connectionStatus: ConnectionStatus;
  lastBootstrapAt: number | null;
  soundEnabled: boolean;
  setSoundEnabled: (v: boolean) => void;
  /** mark entity for 1.5s flash; returns true if should flash (not deduped) */
  markFlash: (key: string) => boolean;
  /** sound once per RED transition with 3s cooldown; returns true if should play */
  shouldPlayRedSound: (victimId: string) => boolean;
  bootstrap: () => Promise<void>;
  /** whether key is currently in flash window */
  isFlashing: (key: string) => boolean;
  /** bumps when flash map changes — for useFlash re-render */
  flashGen: number;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

function mergeVictimInList(
  list: VictimRow[] | undefined,
  victim: VictimRow
): VictimRow[] {
  if (!list) return [victim];
  const idx = list.findIndex((v) => v.id === victim.id);
  if (idx === -1) return [victim, ...list];
  const next = list.slice();
  next[idx] = { ...list[idx], ...victim };
  return next;
}

function patchVictimInList(
  list: VictimRow[] | undefined,
  id: string,
  patch: Partial<VictimRow>
): VictimRow[] | undefined {
  if (!list) return list;
  return list.map((v) => (v.id === id ? { ...v, ...patch } : v));
}

function prependAlert(list: Alert[] | undefined, alert: Alert): Alert[] {
  if (!list) return [alert];
  if (list.some((a) => a.id === alert.id)) return list;
  return [alert, ...list];
}

/**
 * True when an alert belongs in the cache behind `queryKey`.
 *
 * The key's last element is the `ListAlertsParams` the query was built with
 * (`queryKeys.alerts.list`), so the filter is read back from the key rather
 * than tracked separately. `limit` is ignored: one extra row at the head is
 * harmless, and dropping the tail here would fight the server's ordering.
 */
function matchesAlertFilter(queryKey: readonly unknown[], alert: Alert) {
  const params = queryKey[queryKey.length - 1];
  if (!params || typeof params !== 'object') return true;
  const { severity, acked } = params as { severity?: string; acked?: boolean };
  if (severity !== undefined && severity !== alert.severity) return false;
  if (acked !== undefined && acked !== alert.acknowledged) return false;
  return true;
}

function prependActivity(
  list: Activity[] | undefined,
  item: Activity
): Activity[] {
  if (!list) return [item];
  if (list.some((a) => a.id === item.id)) return list;
  return [item, ...list].slice(0, ACTIVITY_CAP);
}

async function runBootstrap(queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.fetchQuery({
      queryKey: queryKeys.kpis,
      queryFn: () => api.getKpis(),
    }),
    queryClient.fetchQuery({
      queryKey: queryKeys.victims.list({}),
      queryFn: () => api.listVictims(),
    }),
    queryClient.fetchQuery({
      queryKey: queryKeys.alerts.list({ acked: false }),
      queryFn: () => api.listAlerts({ acked: false, limit: 50 }),
    }),
    queryClient.fetchQuery({
      queryKey: queryKeys.nodes.list({}),
      queryFn: () => api.listNodes(),
    }),
    queryClient.fetchQuery({
      queryKey: queryKeys.stations.list({}),
      queryFn: () => api.listStations(),
    }),
    queryClient.fetchQuery({
      queryKey: queryKeys.settings,
      queryFn: () => api.getSettings(),
    }),
    queryClient.fetchQuery({
      queryKey: queryKeys.activity({ limit: 20 }),
      queryFn: () => api.getActivity({ limit: 20 }),
    }),
  ]);
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>('connecting');
  const [lastBootstrapAt, setLastBootstrapAt] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabledState] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const raw = window.localStorage.getItem(SOUND_LS_KEY);
      if (raw === 'false') return false;
      if (raw === 'true') return true;
    } catch {
      /* ignore storage read */
    }
    return true;
  });
  const [flashGen, setFlashGen] = useState(0);

  const flashMapRef = useRef(new Map<string, number>());
  const lastRedSoundAtRef = useRef(0);
  const redAlarmedRef = useRef(new Set<string>());
  const everConnectedRef = useRef(false);
  const bootstrappingRef = useRef(false);
  const soundEnabledRef = useRef(soundEnabled);

  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
  }, [soundEnabled]);

  const setSoundEnabled = useCallback((v: boolean) => {
    setSoundEnabledState(v);
    try {
      localStorage.setItem(SOUND_LS_KEY, String(v));
    } catch {
      /* ignore */
    }
  }, []);

  const markFlash = useCallback((key: string) => {
    const now = Date.now();
    const expires = flashMapRef.current.get(key);
    if (expires !== undefined && expires > now) return false;
    flashMapRef.current.set(key, now + FLASH_MS);
    setFlashGen((g) => g + 1);
    window.setTimeout(() => setFlashGen((g) => g + 1), FLASH_MS + 16);
    return true;
  }, []);

  const isFlashing = useCallback((key: string) => {
    const exp = flashMapRef.current.get(key);
    return exp !== undefined && exp > Date.now();
  }, []);

  const shouldPlayRedSound = useCallback((victimId: string) => {
    if (!soundEnabledRef.current) return false;
    if (redAlarmedRef.current.has(victimId)) return false;
    const now = Date.now();
    if (now - lastRedSoundAtRef.current < RED_SOUND_COOLDOWN_MS) return false;
    redAlarmedRef.current.add(victimId);
    lastRedSoundAtRef.current = now;
    return true;
  }, []);

  const clearDedupMaps = useCallback(() => {
    flashMapRef.current.clear();
    redAlarmedRef.current.clear();
    lastRedSoundAtRef.current = 0;
    setFlashGen((g) => g + 1);
  }, []);

  const bootstrap = useCallback(async () => {
    if (bootstrappingRef.current) return;
    bootstrappingRef.current = true;
    try {
      await runBootstrap(queryClient);
      setLastBootstrapAt(Date.now());
    } finally {
      bootstrappingRef.current = false;
    }
  }, [queryClient]);

  useEffect(() => {
    const socket = getSocket();
    let cancelled = false;

    const onVictimCreated = (victim: WsVictimCreated) => {
      queryClient.setQueriesData<VictimRow[]>(
        { queryKey: [...queryKeys.victims.all, 'list'] },
        (old) => mergeVictimInList(old, victim)
      );
      queryClient.setQueryData(queryKeys.victims.detail(victim.id), victim);
      markFlash(`victim:${victim.id}:create`);
    };

    const onVictimUpdated = (victim: WsVictimUpdated) => {
      queryClient.setQueriesData<VictimRow[]>(
        { queryKey: [...queryKeys.victims.all, 'list'] },
        (old) => mergeVictimInList(old, victim)
      );
      queryClient.setQueryData<VictimRow>(
        queryKeys.victims.detail(victim.id),
        (old) => (old ? { ...old, ...victim } : victim)
      );
    };

    const onPriorityChanged = (payload: WsPriorityChanged) => {
      const patch: Partial<VictimRow> = {
        currentPriority: payload.to as VictimRow['currentPriority'],
      };
      if (payload.confidence !== undefined) {
        patch.confidence = payload.confidence ?? null;
      }
      if (payload.reasons !== undefined) {
        patch.reasons = payload.reasons;
      }
      if (payload.esi !== undefined) {
        patch.esi = payload.esi ?? null;
      }
      if (payload.nodeId !== undefined) {
        patch.currentNodeId = payload.nodeId ?? null;
      }

      queryClient.setQueriesData<VictimRow[]>(
        { queryKey: [...queryKeys.victims.all, 'list'] },
        (old) => patchVictimInList(old, payload.victimId, patch)
      );
      queryClient.setQueryData<VictimRow>(
        queryKeys.victims.detail(payload.victimId),
        (old) => (old ? { ...old, ...patch } : old)
      );
      markFlash(`victim:${payload.victimId}:priority`);

      if (payload.to === 'RED') {
        if (shouldPlayRedSound(payload.victimId)) {
          window.dispatchEvent(
            new CustomEvent('triagebox:red-sound', {
              detail: { victimId: payload.victimId },
            })
          );
        }
      } else {
        redAlarmedRef.current.delete(payload.victimId);
      }
    };

    const onVitalUpdated = (payload: WsVitalUpdated) => {
      // The vitals are socket-only: Victim has no vital columns, so this patch
      // is the ONLY place list caches ever hold hr/spo2/rr/bp/battery/esi. Any
      // invalidate/fetch (bootstrap, reconnect, refresh) wipes them until the
      // next reading — see VictimRow in types/index.ts.
      const patch: Partial<VictimRow> = {
        hr: payload.hr ?? null,
        spo2: payload.spo2 ?? null,
        rr: payload.rr ?? null,
        bpSys: payload.bpSys ?? null,
        bpDia: payload.bpDia ?? null,
        battery: payload.battery ?? null,
        esi: payload.esi ?? null,
        lastUpdate: payload.ts,
        currentNodeId: payload.nodeId,
        currentPriority: payload.priority as VictimRow['currentPriority'],
        // hrSource is `HrSource | null` but the patch type wants `?: X | null`;
        // undefined here would keep the previous value, so normalize to null.
        hrSource: payload.hrSource ?? null,
      };
      if (payload.bpMeasuredAt !== undefined) {
        patch.bpMeasuredAt = payload.bpMeasuredAt ?? null;
      }
      // age/gender are NOT patched here on purpose: they are victim columns, so
      // `vital.updated` does not carry them and the `victim.updated` snapshot
      // that follows every reading does. Patching them from this event would
      // blank an answered age on every reading that omits the key.
      queryClient.setQueriesData<VictimRow[]>(
        { queryKey: [...queryKeys.victims.all, 'list'] },
        (old) => patchVictimInList(old, payload.victimId, patch)
      );
      queryClient.setQueryData<VictimRow>(
        queryKeys.victims.detail(payload.victimId),
        (old) => (old ? { ...old, ...patch } : old)
      );
    };

    const onNodeStatus = (payload: WsNodeStatus) => {
      const apply = (n: Node): Node =>
        n.id === payload.nodeId
          ? {
              ...n,
              status: payload.status as Node['status'],
              battery:
                payload.battery !== undefined ? payload.battery : n.battery,
              rssi: payload.rssi !== undefined ? payload.rssi : n.rssi,
              snr: payload.snr !== undefined ? payload.snr : n.snr,
              lastSeen:
                payload.lastSeen !== undefined ? payload.lastSeen : n.lastSeen,
            }
          : n;

      queryClient.setQueriesData<Node[]>(
        { queryKey: [...queryKeys.nodes.all, 'list'] },
        (old) => (old ? old.map(apply) : old)
      );
    };

    const onStationStatus = (payload: WsStationStatus) => {
      const apply = (s: Station): Station =>
        s.id === payload.stationId
          ? {
              ...s,
              status: payload.status as Station['status'],
              lastSeen:
                payload.lastSeen !== undefined ? payload.lastSeen : s.lastSeen,
            }
          : s;

      queryClient.setQueriesData<Station[]>(
        { queryKey: [...queryKeys.stations.all, 'list'] },
        (old) => (old ? old.map(apply) : old)
      );
    };

    /**
     * Invalidated rather than patched: candidates are rare, the list is tiny, and
     * the announce is retained — so a refetch is cheap and it also picks up an
     * adoption performed from another browser tab.
     */
    const onStationPending = () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.stations.pending,
      });
    };

    const onAlertCreated = (alert: WsAlertCreated) => {
      // Patched only into the caches whose filter the alert actually matches:
      // the Alert Center keeps one cache per severity/ack combination, so a
      // blind prepend showed a CRITICAL under "INFO" and an unacked alert under
      // "Sudah ack" until the next refetch.
      queryClient.setQueriesData<Alert[]>(
        {
          queryKey: [...queryKeys.alerts.all, 'list'],
          predicate: (q) => matchesAlertFilter(q.queryKey, alert),
        },
        (old) => prependAlert(old, alert)
      );

      const msg = alert.message || alert.type || 'Alert baru';
      if (alert.severity === 'CRITICAL') {
        // Not Infinity: a toast that never leaves stacks up until a reload.
        // Alert Center is the durable record, the toast is only the nudge.
        toast.error(msg, { duration: 12_000, id: alert.id });
      } else {
        toast(msg, { duration: 4000, id: alert.id });
      }
    };

    const onActivityCreated = (item: WsActivityCreated) => {
      queryClient.setQueriesData<Activity[]>(
        { queryKey: ['activity'] },
        (old) => prependActivity(old, item)
      );
    };

    const onKpiUpdated = (payload: WsKpiUpdated) => {
      // A cold cache is left cold on purpose: fabricating zeros here made
      // "Node Online 0/0" look like a count while `kpi.updated` never fires on
      // node/station transitions, so those zeros never corrected themselves.
      // An absent cache renders its own `?? 0` fallback and fills from
      // runBootstrap, which is the only writer of the full KPI.
      queryClient.setQueryData<Kpi>(queryKeys.kpis, (old) =>
        old
          ? {
              ...old,
              total: payload.total,
              byPriority: payload.byPriority,
            }
          : old
      );
    };

    const handlers: {
      [K in keyof WsEventMap]: (payload: WsEventMap[K]) => void;
    } = {
      'victim.created': onVictimCreated,
      'victim.updated': onVictimUpdated,
      'victim.priority_changed': onPriorityChanged,
      'vital.updated': onVitalUpdated,
      'node.status': onNodeStatus,
      'station.status': onStationStatus,
      'station.pending': onStationPending,
      'alert.created': onAlertCreated,
      'activity.created': onActivityCreated,
      'kpi.updated': onKpiUpdated,
    };

    (Object.keys(handlers) as (keyof WsEventMap)[]).forEach((event) => {
      socket.on(event, handlers[event] as (...args: unknown[]) => void);
    });

    const onConnect = () => {
      if (cancelled) return;
      setConnectionStatus('connected');
      if (everConnectedRef.current) {
        clearDedupMaps();
        void bootstrap().catch((e) =>
          console.warn('[RealtimeProvider] re-bootstrap failed', e)
        );
      }
      everConnectedRef.current = true;
    };

    const onDisconnect = () => {
      if (cancelled) return;
      setConnectionStatus('offline');
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    const onBrowserOffline = () => {
      if (cancelled) return;
      setConnectionStatus('offline');
      try {
        socket.disconnect();
      } catch {
        /* ignore */
      }
    };
    const onBrowserOnline = () => {
      if (cancelled) return;
      setConnectionStatus('connecting');
      if (!socket.connected) socket.connect();
    };
    window.addEventListener('offline', onBrowserOffline);
    window.addEventListener('online', onBrowserOnline);
    void (async () => {
      if (cancelled) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setConnectionStatus('offline');
        return;
      }
      setConnectionStatus('connecting');
      try {
        await bootstrap();
      } catch (e) {
        console.warn('[RealtimeProvider] bootstrap failed', e);
      }
      if (cancelled) return;
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setConnectionStatus('offline');
        return;
      }
      if (!socket.connected) socket.connect();
    })();

    return () => {
      cancelled = true;
      (Object.keys(handlers) as (keyof WsEventMap)[]).forEach((event) => {
        socket.off(event, handlers[event] as (...args: unknown[]) => void);
      });
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      window.removeEventListener('offline', onBrowserOffline);
      window.removeEventListener('online', onBrowserOnline);
    };
  }, [queryClient, bootstrap, markFlash, shouldPlayRedSound, clearDedupMaps]);

  const value = useMemo<RealtimeContextValue>(
    () => ({
      connectionStatus,
      lastBootstrapAt,
      soundEnabled,
      setSoundEnabled,
      markFlash,
      shouldPlayRedSound,
      bootstrap,
      isFlashing,
      flashGen,
    }),
    [
      connectionStatus,
      lastBootstrapAt,
      soundEnabled,
      setSoundEnabled,
      markFlash,
      shouldPlayRedSound,
      bootstrap,
      isFlashing,
      flashGen,
    ]
  );

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    throw new Error('useRealtime must be used within RealtimeProvider');
  }
  return ctx;
}

/** Returns true while flash window for key is active; auto-clears after 1.5s. */
export function useFlash(key: string): boolean {
  const { isFlashing, flashGen } = useRealtime();
  // flashGen forces re-eval when map changes
  void flashGen;
  return isFlashing(key);
}
