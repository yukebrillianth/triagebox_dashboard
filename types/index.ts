/** Live backend REST/WS shapes (camelCase). Source: api-contract + curl. */

export type Priority = 'RED' | 'YELLOW' | 'GREEN' | 'BLACK';
/** MQTT only ever sends 'M' or 'F' — an unasked gender is an absent key, not a
 *  fabricated 'U'. 'U' reaches a victim only through the operator's PATCH. */
export type Gender = 'M' | 'F' | 'U';
export type OnlineStatus = 'ONLINE' | 'OFFLINE';
/** Patient flow. Non-ACTIVE victims leave the active list and KPIs — the
 *  backend filters, the dashboard only renders what arrives. */
export type VictimStatus = 'ACTIVE' | 'REFERRED' | 'DISCHARGED' | 'DECEASED';
/** Where the HR number came from: the ECG leads, the PPG fallback, or unknown. */
export type HrSource = 'ECG' | 'PPG';

export type PriorityCounts = {
  RED: number;
  YELLOW: number;
  GREEN: number;
  BLACK: number;
};

export type Victim = {
  id: string;
  rfid: string;
  name: string | null;
  /** Years, and the number the model actually scored: the operator picks a band
   *  on the device and the firmware sends its mid-point. Written by ingest but
   *  never blanked by a later reading that omits it — an operator PATCH is the
   *  only way to correct one. */
  age: number | null;
  gender: Gender | null;
  notes: string | null;
  // --- Identity fields (brief butir 6). All optional; filled via dashboard
  // PATCH, never over LoRa. New fields are `?` until the backend ships them.
  /** Full 16-digit NIK — ONLY on GET /api/victims/:id. Lists carry nikMasked. */
  nik?: string | null;
  /** e.g. "3578********0001". Present on list and detail. */
  nikMasked?: string | null;
  address?: string | null;
  familyContactName?: string | null;
  familyContactPhone?: string | null;
  chiefComplaint?: string | null;
  status?: VictimStatus;
  referredAt?: string | null;
  referralDestination?: string | null;
  statusChangedBy?: string | null;
  /** When the BP value last changed/was measured — BP is latched, HR/SpO2 are
   *  live, so BP renders with its own timestamp (brief butir 5). */
  bpMeasuredAt?: string | null;
  /** Undefined until the backend wires it; render only when present. */
  hrSource?: HrSource | null;
  /** Last operator decision: it is NOT overwritten by later device readings. */
  operatorOverride?: {
    priority: Priority;
    reason: string;
    at: string;
  } | null;
  /** True when the last device reading's category differs from the override. */
  deviceDiffersFromOperator?: boolean;
  /** `Priority?` in schema.prisma:72 — a victim row exists before any verdict
   *  does, so every consumer must handle null. */
  currentPriority: Priority | null;
  confidence: number | null;
  reasons: string[];
  currentNodeId: string | null;
  firstSeen: string;
  lastUpdate: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * A victim as the client actually holds it: the REST row plus whatever the last
 * `vital.updated` socket event patched on top.
 *
 * The vitals are socket-only. `model Victim` has no hr/spo2/rr/bp/battery
 * columns, so no endpoint returns them — which means every `runBootstrap()` or
 * `invalidateQueries()` (page refresh, socket reconnect, saving registration)
 * replaces the row with the REST shape and blanks all vitals until the next
 * reading lands. Only the detail page has a fallback:
 * `GET /api/victims/:id/vitals`. The list and Command Center do not.
 */
export type VictimRow = Victim & {
  hr?: number | null;
  spo2?: number | null;
  /** Operator-entered band mid-point, not a measurement — see `VitalReading.rr`
   *  and the "RR (input operator)" label every surface renders it under. */
  rr?: number | null;
  bpSys?: number | null;
  bpDia?: number | null;
  battery?: number | null;
  /** Raw ESI 1..5 of the last reading. Socket-only for the same reason the
   *  vitals are: it is `VitalReading.esi`, per reading, not a victim column. */
  esi?: number | null;
};

export type Kpi = {
  total: number;
  byPriority: PriorityCounts;
  onlineNodes: number;
  totalNodes: number;
  onlineStations: number;
  totalStations: number;
};

export type Station = {
  id: string;
  name: string;
  status: OnlineStatus;
  lastSeen: string | null;
  firmware: string | null;
  ipAddress: string | null;
  notes: string | null;
  /** Health-post identity (brief butir 9). Optional until backend ships. */
  postName?: string | null;
  locationLabel?: string | null;
  nodeCapacity?: number;
  /** Station's configured poll period in seconds, from its configuration. */
  pollPeriodSec?: number;
  /** Sent by the backend, shown nowhere: the broker a station connects to is
   *  the backend's own `MQTT_URL`, so these two never described anything the
   *  operator could change. Do not put them back on a form. */
  mqttBrokerHost: string | null;
  mqttBrokerPort: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  nodeCount?: number;
};

export type Node = {
  id: string;
  stationId: string;
  name: string;
  status: OnlineStatus;
  rssi: number | null;
  snr: number | null;
  battery: number | null;
  firmware: string | null;
  packetCount: number | null;
  /** Link-quality extras (brief butir 9/10). Optional until backend ships. */
  expectedPackets?: number | null;
  packetLossPct?: number | null;
  lastSeen: string | null;
  currentVictimId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  station?: Station;
  currentVictim?: Victim | null;
};

export type Alert = {
  id: string;
  severity: string;
  type: string;
  message: string;
  victimId: string | null;
  nodeId: string | null;
  stationId: string | null;
  payload: unknown | null;
  acknowledged: boolean;
  createdAt: string;
};

export type Activity = {
  id: string;
  type: string;
  message: string;
  refs?: Record<string, unknown> | null;
  createdAt: string;
};

export type Settings = Record<string, string>;

/** Read-only timing block inside GET /api/settings (brief butir 4). */
export type TimingSettings = {
  pollPeriodSec?: number;
  nodeOfflineSec?: number;
  linkStaleSec?: number;
};

export type Health = {
  status: string;
  db: string;
  mqtt: string;
  uptimeSec: number;
};

export type AnalyticsSummary = {
  byPriority: PriorityCounts;
  hourlyTrend: { hour: string; count: number }[];
  activeNodes?: number;
  avgBattery?: number | null;
  nodesTelemetry?: {
    id: string;
    name: string;
    rssi: number | null;
    snr: number | null;
    battery: number | null;
    status: string;
  }[];
};

export type ReportSummary = {
  victims: Victim[];
  counts: unknown;
  triageHistoryCount?: number;
  /** `recentActivity` in src/system/system.service.ts; the contract doc still says activityTimeline — stale. */
  recentActivity?: Activity[];
};

export type VitalReading = {
  id: string;
  victimId: string;
  nodeId?: string | null;
  hr?: number | null;
  spo2?: number | null;
  /**
   * Whole breaths/min, but NOT a measurement: the breathing microphone is not
   * fitted, so this is the mid-point of the four-band answer the operator taps
   * on the device (<12 → 10, 12–20 → 16, 21–30 → 25, >30 → 36). It is the value
   * the triage model was scored on, which is why it is shown at all — labelled
   * as an operator entry everywhere, never as a sensor reading.
   */
  rr?: number | null;
  bpSys?: number | null;
  bpDia?: number | null;
  battery?: number | null;
  priority?: Priority | string | null;
  confidence?: number | null;
  /** Raw ESI 1..5 behind `priority`; null means the model refused to score.
   *  The device collapses ESI 3/4/5 into GREEN, so this is the only field that
   *  keeps a walking-wounded 5 apart from a could-deteriorate 3. */
  esi?: number | null;
  /** BP is latched between measurements; when it last changed (butir 5). */
  bpMeasuredAt?: string | null;
  /** Which lead produced HR, once the node reports it (butir 13). */
  hrSource?: HrSource | null;
  reasons?: string[];
  deviceTs?: string | null;
  /** `receivedAt` in schema.prisma — there is no createdAt column. */
  receivedAt?: string;
  [key: string]: unknown;
};

export type TriageHistory = {
  id: string;
  victimId: string;
  fromPriority?: string | null;
  toPriority: string;
  confidence?: number | null;
  reasons?: string[];
  /** ESI in force at the transition, when the model scored it. */
  esi?: number | null;
  createdAt: string;
  /** 'OPERATOR' entries carry `reason`; device transitions do not. */
  source?: 'OPERATOR' | 'DEVICE' | string | null;
  reason?: string | null;
  [key: string]: unknown;
};

// --- DTOs ---

export type UpdateVictimInput = {
  name?: string | null;
  age?: number | null;
  gender?: Gender | null;
  notes?: string | null;
  /** Identity fields (brief butir 6). nik is validated: exactly 16 digits. */
  nik?: string | null;
  address?: string | null;
  familyContactName?: string | null;
  familyContactPhone?: string | null;
  chiefComplaint?: string | null;
  /** Status flow (brief butir 7). Backend stamps referredAt/statusChangedBy. */
  status?: VictimStatus;
  referralDestination?: string | null;
};

/** POST /api/victims/:id/override — the only path to BLACK. */
export type OverrideVictimInput = {
  priority: Priority;
  reason: string;
};

/**
 * A station publishing on `triagebox/{id}/announce` that is not registered yet.
 * Keyed on MAC: it is the only identity a station cannot change from its own
 * configuration, so every other field here is a suggestion the operator may
 * override when adopting.
 */
export type PendingStation = {
  mac: string;
  announcedStationId: string;
  ip: string | null;
  firmware: string | null;
  nodeCount: number | null;
  firstSeen: string;
  lastSeen: string;
};

export type AdoptStationInput = {
  mac: string;
  id: string;
  name: string;
  nodeCount?: number;
  /** Offset for generated node ids, so a second station starts at node-21. */
  nodeIdBase?: number;
};

export type UpdateStationInput = {
  name?: string;
  notes?: string | null;
};

// --- List query params ---

export type ListVictimsParams = {
  search?: string;
  priority?: Priority;
  nodeId?: string;
  status?: VictimStatus;
  sort?: string;
};

export type ListNodesParams = {
  stationId?: string;
  status?: string;
  includeInactive?: boolean;
};

export type ListStationsParams = {
  includeInactive?: boolean;
};

export type ListAlertsParams = {
  severity?: string;
  acked?: boolean;
  limit?: number;
};

export type ListActivityParams = {
  limit?: number;
};

// --- WebSocket event payloads (T3) ---

export type WsVictimCreated = Victim;
export type WsVictimUpdated = Victim;

export type WsPriorityChanged = {
  victimId: string;
  rfid: string;
  from: Priority | string;
  to: Priority | string;
  confidence?: number | null;
  reasons?: string[];
  esi?: number | null;
  nodeId?: string | null;
};

export type WsVitalUpdated = {
  victimId: string;
  nodeId: string;
  hr?: number | null;
  spo2?: number | null;
  rr?: number | null;
  bpSys?: number | null;
  bpDia?: number | null;
  battery?: number | null;
  priority: Priority | string;
  /** null when the model did not score — never 0, which is not an ESI class. */
  esi?: number | null;
  /** BP is latched between measurements; this is when it last changed. */
  bpMeasuredAt?: string | null;
  /** Present once the node reports which lead produced the HR. */
  hrSource?: HrSource | null;
  ts: string;
};

export type WsNodeStatus = {
  nodeId: string;
  status: OnlineStatus | string;
  battery?: number | null;
  rssi?: number | null;
  snr?: number | null;
  lastSeen?: string | null;
};

export type WsStationStatus = {
  stationId: string;
  status: OnlineStatus | string;
  lastSeen?: string | null;
};

export type WsAlertCreated = Alert;
export type WsActivityCreated = Activity;

export type WsKpiUpdated = {
  /** Victim counts only — this event never carries the node/station counts,
   *  so a KPI cache patched from it keeps whatever runBootstrap fetched. */
  total: number;
  byPriority: PriorityCounts;
};

export type WsEventMap = {
  'victim.created': WsVictimCreated;
  'victim.updated': WsVictimUpdated;
  'victim.priority_changed': WsPriorityChanged;
  'vital.updated': WsVitalUpdated;
  'node.status': WsNodeStatus;
  'station.status': WsStationStatus;
  'station.pending': PendingStation;
  'alert.created': WsAlertCreated;
  'activity.created': WsActivityCreated;
  'kpi.updated': WsKpiUpdated;
};
