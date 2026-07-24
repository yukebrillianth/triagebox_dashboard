/** Live backend REST/WS shapes (camelCase). Source: api-contract + curl. */

export type Priority = 'RED' | 'YELLOW' | 'GREEN' | 'BLACK';
export type Gender = 'M' | 'F' | 'U';
export type OnlineStatus = 'ONLINE' | 'OFFLINE';
export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO' | string;

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
  age: number | null;
  gender: Gender | null;
  notes: string | null;
  currentPriority: Priority;
  confidence: number | null;
  reasons: string[];
  currentNodeId: string | null;
  firstSeen: string;
  lastUpdate: string;
  createdAt: string;
  updatedAt: string;
  /** Optional vitals snapshot on list/detail */
  hr?: number | null;
  spo2?: number | null;
  rr?: number | null;
  bpSys?: number | null;
  bpDia?: number | null;
  battery?: number | null;
  /** Contract alias; live list uses lastUpdate */
  lastSeen?: string | null;
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
  mqttBrokerHost: string | null;
  mqttBrokerPort: number | null;
  notes: string | null;
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
  severity: AlertSeverity;
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

export type Health = {
  status: string;
  db: string;
  mqtt: string;
  uptimeSec: number;
};

export type HourlyTrendPoint = {
  hour: string;
  count: number;
};

export type NodeTelemetry = {
  id: string;
  name: string;
  rssi: number | null;
  snr: number | null;
  battery: number | null;
  status: OnlineStatus | string;
};

export type AnalyticsSummary = {
  byPriority: PriorityCounts;
  hourlyTrend: HourlyTrendPoint[];
  activeNodes?: number;
  avgBattery?: number | null;
  nodesTelemetry?: NodeTelemetry[];
};

export type ReportCounts = {
  total?: number;
  byPriority?: Partial<PriorityCounts>;
};

export type ReportSummary = {
  victims: Victim[];
  counts: ReportCounts | PriorityCounts | unknown;
  triageHistoryCount?: number;
  /** Contract name; live backend may use recentActivity */
  activityTimeline?: Activity[];
  recentActivity?: Activity[];
};

export type VitalReading = {
  id: string;
  victimId: string;
  nodeId?: string | null;
  hr?: number | null;
  spo2?: number | null;
  rr?: number | null;
  bpSys?: number | null;
  bpDia?: number | null;
  battery?: number | null;
  priority?: Priority | string | null;
  confidence?: number | null;
  reasons?: string[];
  deviceTs?: string | null;
  createdAt?: string;
  [key: string]: unknown;
};

export type TriageHistory = {
  id: string;
  victimId: string;
  fromPriority?: string | null;
  toPriority: string;
  confidence?: number | null;
  reasons?: string[];
  createdAt: string;
  [key: string]: unknown;
};

// --- DTOs ---

export type UpdateVictimInput = {
  name?: string | null;
  age?: number | null;
  gender?: Gender | null;
  notes?: string | null;
};

export type CreateStationInput = {
  id: string;
  name: string;
  firmware?: string | null;
  ipAddress?: string | null;
  mqttBrokerHost?: string | null;
  mqttBrokerPort?: number | null;
  notes?: string | null;
};

export type UpdateStationInput = {
  name?: string;
  firmware?: string | null;
  ipAddress?: string | null;
  mqttBrokerHost?: string | null;
  mqttBrokerPort?: number | null;
  notes?: string | null;
};

export type CreateNodeInput = {
  id: string;
  stationId: string;
  name: string;
  firmware?: string | null;
};

export type UpdateNodeInput = {
  name?: string;
  firmware?: string | null;
  stationId?: string;
};

// --- List query params ---

export type ListVictimsParams = {
  search?: string;
  priority?: Priority;
  nodeId?: string;
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
  'alert.created': WsAlertCreated;
  'activity.created': WsActivityCreated;
  'kpi.updated': WsKpiUpdated;
};
