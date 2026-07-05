import { describe, expect, it } from 'vitest';
import { buildSettingsEntries, buildSettingsGroups, formatSettingsValue, normalizeSettingsMetadata } from './settingsView';

const baseEntry = {
  fileChanged: false,
  pendingRestart: false,
  restartRequired: false,
  writableType: '',
};

describe('settings view helpers', () => {
  it('sorts settings by internal importance without hiding values', () => {
    const entries = buildSettingsEntries(
      {
        apiKeyPath: '/tmp/apikey.txt',
        zUnknownSetting: true,
        aUnknownSetting: false,
        localeLang: 'en',
        maxPeers: 12,
        sslKeystorePassword: 'secret',
      },
    );

    expect(entries).toEqual([
      { ...baseEntry, key: 'localeLang', value: 'en' },
      { ...baseEntry, key: 'maxPeers', value: '12' },
      { ...baseEntry, key: 'apiKeyPath', value: '/tmp/apikey.txt' },
      { ...baseEntry, key: 'sslKeystorePassword', value: 'secret' },
      { ...baseEntry, key: 'aUnknownSetting', value: 'false' },
      { ...baseEntry, key: 'zUnknownSetting', value: 'true' },
    ]);
  });

  it('formats structured settings compactly', () => {
    expect(formatSettingsValue(['IP', 'I2P'])).toBe('["IP","I2P"]');
    expect(formatSettingsValue({ enabled: true })).toBe('{"enabled":true}');
    expect(formatSettingsValue('')).toBe('-');
    expect(formatSettingsValue(null)).toBe('-');
  });

  it('splits ordered settings into internal groups without visible labels', () => {
    const groups = buildSettingsGroups(
      {
        allowedTransports: ['IP', 'I2P'],
        allowConnectionsWithOlderPeerVersions: false,
        apiDocumentationEnabled: false,
        autoRestartEnabled: false,
        autoUpdateMode: 'OFF',
        chatMessageRetentionPeriod: 86400000,
        apiPort: 24891,
        listenDataPort: 24894,
        listenPort: 24892,
        localeLang: 'en',
        maxBlocksPerRequest: 100,
        maxDataPeers: 64,
        maxPeers: 12,
        maxRetries: 3,
        maxStorageCapacity: 1000000000,
        minBlockchainPeers: 3,
        minOutboundPeers: 8,
        minPeerVersion: '1.3.0',
        publicDataEnabled: true,
        qdnEnabled: true,
        storagePolicy: 'FOLLOWED_OR_VIEWED',
        zUnknownSetting: true,
      },
    );

    expect(groups.map((group) => group.entries.map((entry) => entry.key))).toEqual([
      [
        'autoUpdateMode',
        'autoRestartEnabled',
        'allowedTransports',
        'listenPort',
        'listenDataPort',
        'maxPeers',
        'maxDataPeers',
        'minOutboundPeers',
        'minBlockchainPeers',
        'minPeerVersion',
        'allowConnectionsWithOlderPeerVersions',
        'qdnEnabled',
        'storagePolicy',
        'maxStorageCapacity',
        'publicDataEnabled',
        'apiDocumentationEnabled',
        'chatMessageRetentionPeriod',
      ],
      ['localeLang'],
      ['maxBlocksPerRequest', 'maxRetries'],
      ['apiPort'],
      ['zUnknownSetting'],
    ]);
  });

  it('normalizes settings metadata and annotates settings entries', () => {
    const metadata = normalizeSettingsMetadata({
      fileChanged: ['storagePolicy'],
      fileDiffersFromRuntime: true,
      pendingRestart: ['allowedTransports'],
      settingsPath: '/home/user/qortium/settings.json',
      writable: {
        allowedTransports: { restartRequired: true, type: 'ALLOWED_TRANSPORTS' },
        storagePolicy: { restartRequired: false, type: 'STORAGE_POLICY' },
      },
    });
    const entries = buildSettingsEntries(
      {
        allowedTransports: ['IP', 'I2P'],
        storagePolicy: 'FOLLOWED_AND_VIEWED',
      },
      metadata,
    );

    expect(metadata?.settingsPath).toBe('/home/user/qortium/settings.json');
    expect(entries).toEqual([
      {
        fileChanged: false,
        key: 'allowedTransports',
        pendingRestart: true,
        restartRequired: true,
        value: '["IP","I2P"]',
        writableType: 'ALLOWED_TRANSPORTS',
      },
      {
        fileChanged: true,
        key: 'storagePolicy',
        pendingRestart: false,
        restartRequired: false,
        value: 'FOLLOWED_AND_VIEWED',
        writableType: 'STORAGE_POLICY',
      },
    ]);
  });

  it('normalizes Core JAXB map metadata entries', () => {
    const metadata = normalizeSettingsMetadata({
      writable: {
        entry: [
          {
            key: 'qdnEnabled',
            value: { restartRequired: true, type: 'BOOLEAN' },
          },
          {
            key: 'storagePolicy',
            value: { restartRequired: false, type: 'STORAGE_POLICY' },
          },
        ],
      },
    });

    expect(metadata?.writable?.qdnEnabled).toEqual({
      restartRequired: true,
      type: 'BOOLEAN',
    });
    expect(metadata?.writable?.storagePolicy).toEqual({
      restartRequired: false,
      type: 'STORAGE_POLICY',
    });
  });
});
