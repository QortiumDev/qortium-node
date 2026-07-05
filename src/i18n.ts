export type MessageValues = Record<string, string | number>;

export const EN_STRINGS = {
  'app.title': 'Node',
  'common.blocked': 'blocked',
  'common.down': 'down',
  'common.editable': 'editable',
  'common.no': 'no',
  'common.none': 'none',
  'common.idle': 'idle',
  'common.notPublic': 'not public',
  'common.planned': 'planned',
  'common.readOnly': 'read-only',
  'common.unknown': 'unknown',
  'common.up': 'up',
  'common.yes': 'yes',
  'label.actions': 'Actions',
  'label.address': 'Address',
  'label.age': 'Age',
  'label.chain': 'Chain',
  'label.backoff': 'Backoff',
  'label.chainInboundReachable': 'Chain inbound reachable',
  'label.chainListenSocket': 'Chain listen socket',
  'label.chainPeers': 'Chain peers',
  'label.chainPortMapped': 'Chain port mapped',
  'label.connectable': 'Connectable',
  'label.connected': 'Connected',
  'label.connectedPeers': 'Connected Peers',
  'label.coreSettings': 'Core Settings',
  'label.dataPeers': 'Data peers',
  'label.direction': 'Direction',
  'label.distinctNodeIds': 'Distinct node IDs',
  'label.futureBridgeActions': 'Bridge actions',
  'label.handshaked': 'Handshaked',
  'label.height': 'Height',
  'label.hours': 'hours',
  'label.ip': 'IP',
  'label.i2p': 'I2P',
  'label.incoming': 'Incoming',
  'label.i2pSession': 'I2P session',
  'label.known': 'Known',
  'label.language': 'Language',
  'label.lastUsed': 'Last used',
  'label.mintingPossible': 'Minting possible',
  'label.missingNow': 'Missing now',
  'label.network': 'Network',
  'label.nodeId': 'Node ID',
  'label.nodeIdsOnBothNetworks': 'Node IDs on both networks',
  'label.nodeStatus': 'Node Status',
  'label.outgoing': 'Outgoing',
  'label.peerBreakdown': 'Peer Breakdown',
  'label.peerDiagnostics': 'Peer Diagnostics',
  'label.ping': 'Ping',
  'label.publicNetworkMode': 'Public network mode',
  'label.pendingRestart': 'Pending restart',
  'label.qdnData': 'QDN data',
  'label.qdnFallbackCandidates': 'QDN fallback candidates',
  'label.qdnInboundReachable': 'QDN inbound reachable',
  'label.qdnListenSocket': 'QDN listen socket',
  'label.qdnPortMapped': 'QDN port mapped',
  'label.remainingSyncBlocks': 'Remaining sync blocks',
  'label.refresh': 'Refresh',
  'label.reasonSummary': 'Reason summary',
  'label.restart': 'Restart',
  'label.runtime': 'Runtime',
  'label.save': 'Save',
  'label.savedChanges': 'Saved changes',
  'label.settingsFile': 'Settings file',
  'label.status': 'Status',
  'label.sync': 'Sync',
  'label.setting': 'Setting',
  'label.total': 'Total',
  'label.totalPeerSockets': 'Total peer sockets',
  'label.transport': 'Transport',
  'label.value': 'Value',
  'label.version': 'Version',
  'label.writableSettings': 'Writable settings',
  'message.bridgeAvailable': 'bridge available',
  'message.browserFallback': 'browser fallback',
  'message.connectableDataPeersAvailable': 'No connected data peers, but {count} known data peer candidates are currently connectable.',
  'message.dataPeerI2pSessionDown': 'No connected data peers. I2P session is down; current blockers: {reasons}.',
  'message.loadingNodeData': 'Loading node data...',
  'message.noConnectableDataPeers': 'No connected data peers and no known data peer candidates are currently connectable. Current blockers: {reasons}.',
  'message.noConnectedPeers': 'No connected peers reported by the selected node.',
  'message.noKnownDataPeers': 'No connected data peers and Core has no known data peer candidates.',
  'message.noSettingsReported': 'No Core settings were reported by the selected node.',
  'message.peerDiagnosticsUnavailable': 'Diagnostics unavailable.',
  'message.restartRequested': 'Restart requested.',
  'message.settingsDisabled': 'Settings editor disabled in Phase 1',
  'message.settingsReadOnly':
    'Settings edits use Home-mediated, API-key-protected bridge actions.',
  'message.settingsSaved': 'Settings saved.',
  'message.settingsSavedRestartRequired': 'Settings saved. Restart is required to apply all changes.',
  'message.sockets': '{count} sockets',
  'message.syncedPercent': '{percent}% {phase}',
  'message.timeAgo': '{age} ago',
  'message.versionUnknown': 'version unknown',
} as const;

export type MessageKey = keyof typeof EN_STRINGS;

const DEFAULT_LANGUAGE = 'en';
const RTL_LANGUAGES = new Set(['ar', 'he']);

function normalizeRawLanguage(language: string) {
  return language.trim().replace(/_/g, '-').toLowerCase();
}

export function normalizeLanguage(language: string | undefined) {
  if (!language) {
    return DEFAULT_LANGUAGE;
  }

  const normalized = normalizeRawLanguage(language);
  const explicit: Record<string, string> = {
    'en-gb': 'en',
    'en-us': 'en',
    'zh-cn': 'zh-CN',
    'zh-hans': 'zh-CN',
    'zh-hant': 'zh-TW',
    'zh-tw': 'zh-TW',
  };

  if (explicit[normalized]) {
    return explicit[normalized];
  }

  if (normalized.startsWith('zh-')) {
    return normalized.includes('tw') || normalized.includes('hk') || normalized.includes('mo') || normalized.includes('hant')
      ? 'zh-TW'
      : 'zh-CN';
  }

  return normalized.split('-')[0] || DEFAULT_LANGUAGE;
}

export function isRtlLanguage(language: string) {
  return RTL_LANGUAGES.has(normalizeLanguage(language));
}

function interpolate(message: string, values?: MessageValues) {
  if (!values) {
    return message;
  }

  return message.replace(/\{(\w+)\}/g, (match, key) => {
    const value = values[key];

    return value === undefined ? match : String(value);
  });
}

export function createTranslator(_language: string | undefined) {
  return function translate(key: MessageKey, values?: MessageValues) {
    return interpolate(EN_STRINGS[key] ?? key, values);
  };
}

export type TranslateFunction = ReturnType<typeof createTranslator>;
