import type {
  ConnectedPeer,
  KnownPeerDiagnostic,
  KnownPeerDiagnostics,
  NodeApiFetchResult,
  PeerBreakdown,
  PeerDirection,
  PeerKind,
  PeerNetworkBreakdown,
  PeerTableRow,
  PeerTransport,
} from './types';

type FormatLabels = {
  empty: string;
  idle: string;
  no: string;
  timeAgo: (age: string) => string;
  unknown: string;
  yes: string;
};

const EMPTY_NETWORK_BREAKDOWN: PeerNetworkBreakdown = {
  inbound: 0,
  i2p: 0,
  ip: 0,
  outbound: 0,
  total: 0,
  unknownDirection: 0,
  unknownTransport: 0,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function getResponseData<T>(result: unknown, fallback: T): T {
  if (result && typeof result === 'object' && 'data' in result) {
    return ((result as NodeApiFetchResult).data ?? fallback) as T;
  }

  return (result ?? fallback) as T;
}

export function normalizePeerList(value: unknown): ConnectedPeer[] {
  return Array.isArray(value) ? value.filter((entry): entry is ConnectedPeer => !!entry && typeof entry === 'object') : [];
}

function normalizeNumber(value: unknown, fallback = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeNullableNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeOptionalBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : undefined;
}

function normalizeStringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && !!entry.trim()).map((entry) => entry.trim())
    : [];
}

function normalizeReasonCounts(value: unknown): Record<string, number> {
  const counts: Record<string, number> = {};

  if (!isRecord(value)) {
    return counts;
  }

  const entries = Array.isArray(value.entry)
    ? value.entry
      .filter(isRecord)
      .map((entry) => [entry.key, entry.value] as const)
    : Object.entries(value).filter(([key]) => key !== 'entry');

  for (const [rawKey, rawCount] of entries) {
    const key = typeof rawKey === 'string' ? rawKey.trim() : '';
    const count = normalizeNumber(rawCount);

    if (key && count > 0) {
      counts[key] = count;
    }
  }

  return counts;
}

function normalizePeerDiagnostic(value: unknown): KnownPeerDiagnostic | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    ...value,
    address: typeof value.address === 'string' ? value.address : undefined,
    addedBy: typeof value.addedBy === 'string' ? value.addedBy : undefined,
    addedWhen: normalizeNullableNumber(value.addedWhen) ?? undefined,
    backoffUntil: normalizeNullableNumber(value.backoffUntil) ?? undefined,
    connectable: value.connectable === true,
    connected: value.connected === true,
    failedSyncCount: normalizeNumber(value.failedSyncCount),
    handshaked: value.handshaked === true,
    inBackoff: value.inBackoff === true,
    isolationRetryCandidate: value.isolationRetryCandidate === true,
    lastAttempted: normalizeNullableNumber(value.lastAttempted) ?? undefined,
    lastConnected: normalizeNullableNumber(value.lastConnected) ?? undefined,
    lastMisbehaved: normalizeNullableNumber(value.lastMisbehaved) ?? undefined,
    nodeId: typeof value.nodeId === 'string' ? value.nodeId : undefined,
    outbound: typeof value.outbound === 'boolean' ? value.outbound : null,
    reasons: normalizeStringList(value.reasons),
    tags: normalizeStringList(value.tags),
    transport: typeof value.transport === 'string' ? value.transport : undefined,
  };
}

export function normalizePeerDiagnostics(value: unknown): KnownPeerDiagnostics | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    allowedTransports: normalizeStringList(value.allowedTransports),
    backoffCount: normalizeNumber(value.backoffCount),
    connectableCount: normalizeNumber(value.connectableCount),
    connectedCount: normalizeNumber(value.connectedCount),
    handshakedCount: normalizeNumber(value.handshakedCount),
    i2pSessionUp: normalizeOptionalBoolean(value.i2pSessionUp),
    knownCount: normalizeNumber(value.knownCount),
    layer: typeof value.layer === 'string' ? value.layer : undefined,
    outboundHandshakedCount: normalizeNumber(value.outboundHandshakedCount),
    peers: Array.isArray(value.peers)
      ? value.peers.map(normalizePeerDiagnostic).filter((peer): peer is KnownPeerDiagnostic => peer !== null)
      : [],
    qdnFallbackCandidateCount: normalizeNullableNumber(value.qdnFallbackCandidateCount),
    reasonCounts: normalizeReasonCounts(value.reasonCounts),
  };
}

export function getPeerDiagnosticReasonEntries(diagnostics: KnownPeerDiagnostics | null, limit = 4) {
  if (!diagnostics) {
    return [];
  }

  return Object.entries(diagnostics.reasonCounts)
    .sort(([leftReason, leftCount], [rightReason, rightCount]) => {
      if (rightCount !== leftCount) {
        return rightCount - leftCount;
      }

      return leftReason.localeCompare(rightReason);
    })
    .slice(0, Math.max(0, limit));
}

export function normalizeTransport(peer: ConnectedPeer): PeerTransport {
  const rawTransport = typeof peer.transport === 'string' ? peer.transport.trim().toLowerCase() : '';
  const address = typeof peer.address === 'string' ? peer.address.trim().toLowerCase() : '';

  if (rawTransport === 'i2p' || address.includes('.i2p')) {
    return 'i2p';
  }

  if (rawTransport === 'ip' || address) {
    return 'ip';
  }

  return 'unknown';
}

export function normalizeDirection(peer: ConnectedPeer): PeerDirection {
  const rawDirection = typeof peer.direction === 'string' ? peer.direction.trim().toLowerCase() : '';

  if (rawDirection === 'inbound') {
    return 'inbound';
  }

  if (rawDirection === 'outbound') {
    return 'outbound';
  }

  return 'unknown';
}

function cloneEmptyNetworkBreakdown(): PeerNetworkBreakdown {
  return { ...EMPTY_NETWORK_BREAKDOWN };
}

function addPeerToBreakdown(breakdown: PeerNetworkBreakdown, peer: ConnectedPeer) {
  const transport = normalizeTransport(peer);
  const direction = normalizeDirection(peer);

  breakdown.total += 1;

  if (transport === 'ip') {
    breakdown.ip += 1;
  } else if (transport === 'i2p') {
    breakdown.i2p += 1;
  } else {
    breakdown.unknownTransport += 1;
  }

  if (direction === 'inbound') {
    breakdown.inbound += 1;
  } else if (direction === 'outbound') {
    breakdown.outbound += 1;
  } else {
    breakdown.unknownDirection += 1;
  }
}

export function buildPeerBreakdown(chainPeers: ConnectedPeer[], dataPeers: ConnectedPeer[]): PeerBreakdown {
  const chain = cloneEmptyNetworkBreakdown();
  const data = cloneEmptyNetworkBreakdown();
  const nodeIdCounts = new Map<string, number>();

  for (const peer of chainPeers) {
    addPeerToBreakdown(chain, peer);
  }

  for (const peer of dataPeers) {
    addPeerToBreakdown(data, peer);
  }

  for (const peer of [...chainPeers, ...dataPeers]) {
    if (typeof peer.nodeId === 'string' && peer.nodeId.trim()) {
      const nodeId = peer.nodeId.trim();
      nodeIdCounts.set(nodeId, (nodeIdCounts.get(nodeId) ?? 0) + 1);
    }
  }

  return {
    chain,
    data,
    distinctNodeIds: nodeIdCounts.size,
    duplicatedNodeIds: [...nodeIdCounts.values()].filter((count) => count > 1).length,
    total: chain.total + data.total,
  };
}

function formatNumber(value: unknown, labels: Pick<FormatLabels, 'unknown'>) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : labels.unknown;
}

function formatText(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

export function buildPeerRows(
  kind: PeerKind,
  peers: ConnectedPeer[],
  labels: Pick<FormatLabels, 'empty' | 'idle' | 'timeAgo' | 'unknown'>,
  now = Date.now(),
): PeerTableRow[] {
  return peers.map((peer) => ({
    address: formatText(peer.address, labels.unknown),
    age: formatText(peer.age, labels.empty),
    direction: normalizeDirection(peer),
    kind,
    lastAccessed: kind === 'data' ? formatLastAccessed(peer.lastAccessed, labels, now) : labels.empty,
    lastAccessedTimestamp: normalizeTimestamp(peer.lastAccessed),
    lastHeight: kind === 'data' ? labels.empty : formatNumber(peer.lastHeight, labels),
    lastPing: kind === 'data' ? labels.empty : formatNumber(peer.lastPing, labels),
    nodeId: formatText(peer.nodeId, labels.empty),
    transport: normalizeTransport(peer),
    version: formatText(peer.version, labels.empty),
  }));
}

export function formatBoolean(value: unknown, labels: Pick<FormatLabels, 'no' | 'unknown' | 'yes'>) {
  if (value === true) {
    return labels.yes;
  }

  if (value === false) {
    return labels.no;
  }

  return labels.unknown;
}

export function formatMaybeNumber(value: unknown, labels: Pick<FormatLabels, 'unknown'>) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : labels.unknown;
}

function formatLastAccessed(value: unknown, labels: Pick<FormatLabels, 'idle' | 'timeAgo'>, now: number) {
  const timestamp = normalizeTimestamp(value);

  if (timestamp === null) {
    return labels.idle;
  }

  return labels.timeAgo(formatDuration(now - timestamp));
}

function normalizeTimestamp(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value < 1_000_000_000_000 ? value * 1000 : value;
}

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));

  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  const totalMinutes = Math.floor(totalSeconds / 60);

  if (totalMinutes < 60) {
    return `${totalMinutes}m`;
  }

  const totalHours = Math.floor(totalMinutes / 60);

  if (totalHours < 48) {
    return `${totalHours}h`;
  }

  return `${Math.floor(totalHours / 24)}d`;
}
