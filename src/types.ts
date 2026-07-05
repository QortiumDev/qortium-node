export type BridgeState = {
  actions: string[];
  isHomeBridge: boolean;
  ui: string;
};

export type NodeApiFetchResult = {
  body: string;
  contentLength?: number;
  contentType: string;
  data: unknown;
  ok: boolean;
  status: number;
  statusText: string;
};

export type QdnResource = {
  created?: number;
  description?: string;
  identifier?: string;
  name?: string;
  service?: string;
  size?: number;
  status?: string;
  title?: string;
  updated?: number;
  [key: string]: unknown;
};

export type NodeStatus = {
  height?: number;
  isSynchronizing?: boolean;
  isMintingPossible?: boolean;
  isP2PInboundReachable?: boolean;
  isP2PListenSocketAvailable?: boolean;
  isP2PPortMapped?: boolean;
  isQDNInboundReachable?: boolean;
  isQDNListenSocketAvailable?: boolean;
  isQDNPortMapped?: boolean;
  numberOfDataConnections?: number;
  numberOfConnections?: number;
  numberOfInboundConnections?: number;
  numberOfInboundDataConnections?: number;
  numberOfOutboundConnections?: number;
  numberOfOutboundDataConnections?: number;
  syncBlocksRemaining?: number | null;
  syncPercent?: number;
  syncPhase?: string;
  syncTargetHeight?: number | null;
  [key: string]: unknown;
};

export type NodeInfo = {
  buildTimestamp?: string;
  buildVersion?: string;
  nodeId?: string;
  uptime?: number;
  [key: string]: unknown;
};

export type CoreSettings = {
  localeLang?: string;
  [key: string]: unknown;
};

export type CoreSettingsWritableMetadata = {
  restartRequired?: boolean;
  type?: string;
  [key: string]: unknown;
};

export type CoreSettingsMetadata = {
  fileChanged?: string[];
  fileComparisonError?: string;
  fileDiffersFromRuntime?: boolean;
  pendingRestart?: string[];
  settingsPath?: string | null;
  writable?: Record<string, CoreSettingsWritableMetadata>;
  [key: string]: unknown;
};

export type CoreSettingsUpdateResult = {
  applied?: string[];
  removed?: string[];
  restartRequired?: string[];
  saved?: boolean;
  settingsPath?: string;
  updated?: string[];
  [key: string]: unknown;
};

export type ConnectedPeer = {
  address?: string;
  age?: string;
  connectedWhen?: number;
  connectionId?: string;
  direction?: 'INBOUND' | 'OUTBOUND' | string;
  handshakeStatus?: string;
  lastAccessed?: number;
  lastHeight?: number;
  lastPing?: number;
  nodeId?: string;
  peersConnectedWhen?: number;
  transport?: 'IP' | 'I2P' | string;
  version?: string;
  [key: string]: unknown;
};

export type KnownPeerDiagnostic = {
  address?: string;
  addedBy?: string;
  addedWhen?: number;
  backoffUntil?: number;
  connectable?: boolean;
  connected?: boolean;
  failedSyncCount?: number;
  handshaked?: boolean;
  inBackoff?: boolean;
  isolationRetryCandidate?: boolean;
  lastAttempted?: number;
  lastConnected?: number;
  lastMisbehaved?: number;
  nodeId?: string;
  outbound?: boolean | null;
  reasons: string[];
  tags: string[];
  transport?: string;
  [key: string]: unknown;
};

export type KnownPeerDiagnostics = {
  allowedTransports: string[];
  backoffCount: number;
  connectableCount: number;
  connectedCount: number;
  handshakedCount: number;
  i2pSessionUp?: boolean;
  knownCount: number;
  layer?: 'CHAIN' | 'DATA' | string;
  outboundHandshakedCount: number;
  peers: KnownPeerDiagnostic[];
  qdnFallbackCandidateCount?: number | null;
  reasonCounts: Record<string, number>;
};

export type PeerKind = 'chain' | 'data';
export type PeerTransport = 'ip' | 'i2p' | 'unknown';
export type PeerDirection = 'inbound' | 'outbound' | 'unknown';

export type PeerBreakdown = {
  data: PeerNetworkBreakdown;
  distinctNodeIds: number;
  duplicatedNodeIds: number;
  chain: PeerNetworkBreakdown;
  total: number;
};

export type PeerNetworkBreakdown = {
  inbound: number;
  i2p: number;
  ip: number;
  outbound: number;
  total: number;
  unknownDirection: number;
  unknownTransport: number;
};

export type PeerTableRow = {
  address: string;
  age: string;
  direction: PeerDirection;
  kind: PeerKind;
  lastAccessed: string;
  lastAccessedTimestamp: number | null;
  lastHeight: string;
  lastPing: string;
  nodeId: string;
  transport: PeerTransport;
  version: string;
};

export type DisplaySettings = {
  accent: 'blue' | 'cyan' | 'green' | 'orange' | 'pink' | 'purple' | 'red' | 'teal' | 'yellow';
  language: string;
  languageSource: 'core' | 'default' | 'home' | 'query';
  textSize: 'extra-large' | 'extra-small' | 'huge' | 'large' | 'medium' | 'small';
  theme: 'dark' | 'light';
  uiStyle: 'classic' | 'modern';
};
