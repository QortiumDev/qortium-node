import type { CoreSettingsMetadata } from './types';
import { PHASE_1_EDITABLE_SETTING_KEYS } from './settingsEditor';

export type SettingsEntry = {
  fileChanged: boolean;
  key: string;
  pendingRestart: boolean;
  restartRequired: boolean;
  value: string;
  writableType: string;
};

export type SettingsGroup = {
  entries: SettingsEntry[];
  id: number;
};

const FALLBACK_GROUP = 99;
const FALLBACK_PRIORITY = 999;
const EDITABLE_SETTINGS_GROUP = -1;
const EDITABLE_SETTING_KEYS = new Set<string>(PHASE_1_EDITABLE_SETTING_KEYS);

type SettingOrder = {
  group: number;
  priority: number;
};

type NormalizedSettingsMetadata = {
  fileChanged: Set<string>;
  pendingRestart: Set<string>;
  writable: Record<string, { restartRequired: boolean; type: string }>;
};

const SETTING_ORDER: Record<string, SettingOrder> = {
  localeLang: { group: 0, priority: 0 },
  isTestNet: { group: 0, priority: 10 },
  singleNodeTestnet: { group: 0, priority: 11 },
  lite: { group: 0, priority: 20 },
  topOnly: { group: 0, priority: 21 },
  autoUpdateMode: { group: 0, priority: 30 },
  autoRestartEnabled: { group: 0, priority: 31 },

  allowedTransports: { group: 1, priority: 0 },
  listenPort: { group: 1, priority: 10 },
  listenDataPort: { group: 1, priority: 11 },
  bindAddress: { group: 1, priority: 20 },
  bindAddressFallback: { group: 1, priority: 21 },
  maxPeers: { group: 1, priority: 30 },
  maxDataPeers: { group: 1, priority: 31 },
  minOutboundPeers: { group: 1, priority: 40 },
  minBlockchainPeers: { group: 1, priority: 41 },
  minPeerConnectionTime: { group: 1, priority: 50 },
  maxPeerConnectionTime: { group: 1, priority: 51 },
  maxDataPeerConnectionTime: { group: 1, priority: 52 },
  minPeerVersion: { group: 1, priority: 60 },
  allowConnectionsWithOlderPeerVersions: { group: 1, priority: 61 },
  initialPeers: { group: 1, priority: 70 },
  initialDataPeers: { group: 1, priority: 71 },
  i2pEmbeddedRouter: { group: 1, priority: 80 },
  i2pSamHost: { group: 1, priority: 81 },
  i2pSamPort: { group: 1, priority: 82 },
  i2pChainKeyFile: { group: 1, priority: 83 },
  i2pDataKeyFile: { group: 1, priority: 84 },
  recordPeerExchange: { group: 1, priority: 90 },
  uPnPEnabled: { group: 1, priority: 91 },

  qdnEnabled: { group: 2, priority: 0 },
  storagePolicy: { group: 2, priority: 10 },
  maxStorageCapacity: { group: 2, priority: 11 },
  publicDataEnabled: { group: 2, priority: 20 },
  privateDataEnabled: { group: 2, priority: 21 },
  directDataRetrievalEnabled: { group: 2, priority: 30 },
  relayModeEnabled: { group: 2, priority: 31 },
  gatewayEnabled: { group: 2, priority: 40 },
  gatewayLoopbackEnabled: { group: 2, priority: 41 },
  gatewayLoggingEnabled: { group: 2, priority: 42 },
  domainMapEnabled: { group: 2, priority: 50 },
  domainMapLoggingEnabled: { group: 2, priority: 51 },
  publicQdnPublishMaxSize: { group: 2, priority: 60 },
  qdnPushOnPublishEnabled: { group: 2, priority: 61 },
  qdnAuthBypassEnabled: { group: 2, priority: 70 },
  dataPath: { group: 2, priority: 80 },
  listsPath: { group: 2, priority: 81 },
  buildArbitraryResourcesBatchSize: { group: 2, priority: 90 },
  builtDataExpiryInterval: { group: 2, priority: 91 },
  arbitraryIndexingFrequency: { group: 2, priority: 100 },
  arbitraryIndexingPriority: { group: 2, priority: 101 },
  dataStorageSizeCalculationFrequency: { group: 2, priority: 110 },
  dataStorageSizeCalculationHour: { group: 2, priority: 111 },
  rebuildArbitraryResourceCacheTaskEnabled: { group: 2, priority: 120 },
  rebuildArbitraryResourceCacheTaskDelay: { group: 2, priority: 121 },
  rebuildArbitraryResourceCacheTaskPeriod: { group: 2, priority: 122 },
  validateAllDataLayers: { group: 2, priority: 130 },

  bootstrap: { group: 3, priority: 0 },
  bootstrapHosts: { group: 3, priority: 1 },
  bootstrapFilenamePrefix: { group: 3, priority: 2 },
  fastSyncEnabled: { group: 3, priority: 10 },
  fastSyncEnabledWhenResolvingFork: { group: 3, priority: 11 },
  archiveEnabled: { group: 3, priority: 20 },
  archiveServingEnabled: { group: 3, priority: 21 },
  archiveFastReplayEnabled: { group: 3, priority: 22 },
  archiveFastReplayOnlyWhenBootstrapDisabled: { group: 3, priority: 23 },
  archiveInterval: { group: 3, priority: 24 },
  archivingPause: { group: 3, priority: 25 },
  defaultArchiveVersion: { group: 3, priority: 26 },
  repositoryPath: { group: 3, priority: 30 },
  repositoryBackupInterval: { group: 3, priority: 31 },
  repositoryCheckpointInterval: { group: 3, priority: 32 },
  repositoryConnectionPoolSize: { group: 3, priority: 33 },
  repositoryMaintenanceMinInterval: { group: 3, priority: 34 },
  repositoryMaintenanceMaxInterval: { group: 3, priority: 35 },
  pruningThreadPriority: { group: 3, priority: 40 },
  blockPruneBatchSize: { group: 3, priority: 41 },
  blockPruneInterval: { group: 3, priority: 42 },
  pruneBlockLimit: { group: 3, priority: 43 },
  blockCacheSize: { group: 3, priority: 50 },
  blockchainCacheLimit: { group: 3, priority: 51 },
  blockchainConfig: { group: 3, priority: 60 },
  maxBlocksPerRequest: { group: 3, priority: 70 },
  maxBlocksPerResponse: { group: 3, priority: 71 },
  maxRetries: { group: 3, priority: 72 },
  showBackupNotification: { group: 3, priority: 80 },
  showCheckpointNotification: { group: 3, priority: 81 },
  showMaintenanceNotification: { group: 3, priority: 82 },

  apiEnabled: { group: 4, priority: 0 },
  apiPort: { group: 4, priority: 1 },
  apiRestricted: { group: 4, priority: 2 },
  apiWhitelistEnabled: { group: 4, priority: 10 },
  apiWhitelist: { group: 4, priority: 11 },
  publicApiWhitelistEnabled: { group: 4, priority: 20 },
  publicApiWhitelist: { group: 4, priority: 21 },
  publicApiPaths: { group: 4, priority: 22 },
  apiDocumentationEnabled: { group: 4, priority: 30 },
  apiLoggingEnabled: { group: 4, priority: 31 },
  apiKeyPath: { group: 4, priority: 40 },
  sslKeystorePathname: { group: 4, priority: 50 },
  sslKeystorePassword: { group: 4, priority: 51 },
  devProxyEnabled: { group: 4, priority: 60 },
  devProxyUnsafeEvalEnabled: { group: 4, priority: 61 },
  devProxyLoggingEnabled: { group: 4, priority: 62 },

  dbCacheEnabled: { group: 5, priority: 0 },
  dbCacheFrequency: { group: 5, priority: 1 },
  dbCacheThreadPriority: { group: 5, priority: 2 },
  connectionPoolMonitorEnabled: { group: 5, priority: 10 },
  maxNetworkThreadPoolSize: { group: 5, priority: 11 },
  maxThreadsPerMessageType: { group: 5, priority: 12 },
  networkThreadPriority: { group: 5, priority: 20 },
  networkPoWComputePoolSize: { group: 5, priority: 21 },
  handshakeThreadPriority: { group: 5, priority: 22 },
  synchronizerThreadPriority: { group: 5, priority: 23 },
  balanceRecorderEnabled: { group: 5, priority: 30 },
  balanceRecorderCapacity: { group: 5, priority: 31 },
  balanceRecorderFrequency: { group: 5, priority: 32 },
  balanceRecorderPriority: { group: 5, priority: 33 },
  balanceRecorderRollbackAllowance: { group: 5, priority: 34 },
  minimumBalanceRecording: { group: 5, priority: 35 },
  rewardRecordingOnly: { group: 5, priority: 36 },
  hostMonitorEnabled: { group: 5, priority: 40 },
  namesIntegrityCheckEnabled: { group: 5, priority: 50 },
  originalCopyIndicatorFileEnabled: { group: 5, priority: 51 },
  recoveryModeTimeout: { group: 5, priority: 60 },
  recoveryWatchdogEnabled: { group: 5, priority: 61 },
  recoveryWatchdogCooldownMillis: { group: 5, priority: 62 },
  recoveryWatchdogStuckThresholdMillis: { group: 5, priority: 63 },

  pirateChainNet: { group: 6, priority: 0 },
  arrrDefaultBirthday: { group: 6, priority: 1 },
  bitcoinyNetworks: { group: 6, priority: 10 },
  bitcoinyServers: { group: 6, priority: 11 },
  electrumThreadCount: { group: 6, priority: 20 },
  electrumTlsTrustMode: { group: 6, priority: 21 },
  allowPlaintextElectrumServers: { group: 6, priority: 22 },
  bitcoinjLookaheadSize: { group: 6, priority: 30 },
  gapLimit: { group: 6, priority: 31 },
  walletsPath: { group: 6, priority: 40 },
  wallets: { group: 6, priority: 41 },
  tradebotSystrayEnabled: { group: 6, priority: 50 },
  maxTradeOfferAttempts: { group: 6, priority: 51 },

  exportPath: { group: 7, priority: 0 },
  userPath: { group: 7, priority: 1 },
  chatMessageRetentionPeriod: { group: 7, priority: 10 },
  maxRecentChatMessagesPerAccount: { group: 7, priority: 11 },
  recentChatMessagesMaxAge: { group: 7, priority: 12 },
  wipeUnconfirmedOnStart: { group: 7, priority: 20 },
  maxUnconfirmedPerAccount: { group: 7, priority: 21 },
  maxTransactionTimestampFuture: { group: 7, priority: 22 },
  maxTransactionsPerBlock: { group: 7, priority: 23 },
  topBalanceLoggingLimit: { group: 7, priority: 30 },
  ntpServers: { group: 7, priority: 40 },
  atStatesMaxLifetime: { group: 7, priority: 50 },
  atStatesPruneBatchSize: { group: 7, priority: 51 },
  atStatesPruneInterval: { group: 7, priority: 52 },
  atStatesTrimBatchSize: { group: 7, priority: 53 },
  atStatesTrimInterval: { group: 7, priority: 54 },
  atStatesTrimLimit: { group: 7, priority: 55 },
  onlineSignaturesTrimBatchSize: { group: 7, priority: 60 },
  onlineSignaturesTrimInterval: { group: 7, priority: 61 },
};

export function buildSettingsEntries(
  settings: Record<string, unknown> | null,
  metadata?: CoreSettingsMetadata | null,
): SettingsEntry[] {
  return buildSettingsEntryRecords(settings, metadata).map(({ group: _group, ...entry }) => entry);
}

export function buildSettingsGroups(
  settings: Record<string, unknown> | null,
  metadata?: CoreSettingsMetadata | null,
): SettingsGroup[] {
  const editableEntries: SettingsEntry[] = [];
  const groups = new Map<number, SettingsEntry[]>();

  for (const { group, ...entry } of buildSettingsEntryRecords(settings, metadata)) {
    if (EDITABLE_SETTING_KEYS.has(entry.key)) {
      editableEntries.push(entry);
      continue;
    }

    groups.set(group, [...(groups.get(group) ?? []), entry]);
  }

  return [
    ...(editableEntries.length ? [{ id: EDITABLE_SETTINGS_GROUP, entries: editableEntries }] : []),
    ...[...groups.entries()].map(([id, entries]) => ({ id, entries })),
  ];
}

export function normalizeSettingsMetadata(value: unknown): CoreSettingsMetadata | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    ...value,
    fileChanged: normalizeStringList(value.fileChanged),
    fileComparisonError: typeof value.fileComparisonError === 'string' ? value.fileComparisonError : undefined,
    fileDiffersFromRuntime: value.fileDiffersFromRuntime === true,
    pendingRestart: normalizeStringList(value.pendingRestart),
    settingsPath: typeof value.settingsPath === 'string' ? value.settingsPath : null,
    writable: normalizeWritableMetadata(value.writable),
  };
}

function buildSettingsEntryRecords(settings: Record<string, unknown> | null, metadata?: CoreSettingsMetadata | null) {
  if (!settings) {
    return [];
  }

  const normalizedMetadata = getNormalizedSettingsMetadata(metadata);

  return Object.entries(settings)
    .sort(compareSettingsEntries)
    .map(([key, value]) => {
      const group = getSettingOrder(key).group;
      const writable = normalizedMetadata.writable[key];

      return {
        fileChanged: normalizedMetadata.fileChanged.has(key),
        group,
        key,
        pendingRestart: normalizedMetadata.pendingRestart.has(key),
        restartRequired: writable?.restartRequired ?? false,
        value: formatSettingsValue(value),
        writableType: writable?.type ?? '',
      };
    });
}

function getNormalizedSettingsMetadata(metadata?: CoreSettingsMetadata | null): NormalizedSettingsMetadata {
  const writable: NormalizedSettingsMetadata['writable'] = {};

  if (metadata?.writable) {
    for (const [key, value] of Object.entries(metadata.writable)) {
      writable[key] = {
        restartRequired: value.restartRequired === true,
        type: typeof value.type === 'string' ? value.type : '',
      };
    }
  }

  return {
    fileChanged: new Set(normalizeStringList(metadata?.fileChanged)),
    pendingRestart: new Set(normalizeStringList(metadata?.pendingRestart)),
    writable,
  };
}

function normalizeStringList(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string' && !!entry.trim()) : [];
}

function normalizeWritableMetadata(value: unknown): CoreSettingsMetadata['writable'] {
  const writable: CoreSettingsMetadata['writable'] = {};

  if (!isRecord(value)) {
    return writable;
  }

  if (Array.isArray(value.entry)) {
    for (const entry of value.entry) {
      if (!isRecord(entry) || typeof entry.key !== 'string') {
        continue;
      }

      const metadata = normalizeWritableMetadataValue(entry.value);

      if (metadata) {
        writable[entry.key] = metadata;
      }
    }

    return writable;
  }

  for (const [key, metadataValue] of Object.entries(value)) {
    const metadata = normalizeWritableMetadataValue(metadataValue);

    if (metadata) {
      writable[key] = metadata;
    }
  }

  return writable;
}

function normalizeWritableMetadataValue(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  return {
    ...value,
    restartRequired: value.restartRequired === true,
    type: typeof value.type === 'string' ? value.type : undefined,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function compareSettingsEntries([leftKey]: [string, unknown], [rightKey]: [string, unknown]) {
  const leftOrder = getSettingOrder(leftKey);
  const rightOrder = getSettingOrder(rightKey);

  if (leftOrder.group !== rightOrder.group) {
    return leftOrder.group - rightOrder.group;
  }

  if (leftOrder.priority !== rightOrder.priority) {
    return leftOrder.priority - rightOrder.priority;
  }

  return leftKey.localeCompare(rightKey);
}

function getSettingOrder(key: string) {
  return SETTING_ORDER[key] ?? { group: FALLBACK_GROUP, priority: FALLBACK_PRIORITY };
}

export function formatSettingsValue(value: unknown): string {
  if (value === undefined || value === null) {
    return '-';
  }

  if (typeof value === 'string') {
    return value || '-';
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}
