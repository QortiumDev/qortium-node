import { describe, expect, it } from 'vitest';
import {
  buildSettingsPatch,
  canEditSetting,
  formatBytesAsGigabytes,
  formatMillisecondsAsHours,
  getEditableSettingValue,
  getTransportSelectionTransports,
  getTransportSelectionValue,
  normalizeEditableSettingValue,
  patchHasRestartRequiredSettings,
  parseGigabytesToBytes,
  parseHoursToMilliseconds,
} from './settingsEditor';
import type { CoreSettingsMetadata } from './types';

describe('settings editor helpers', () => {
  const metadata: CoreSettingsMetadata = {
    writable: {
      allowedTransports: { restartRequired: true, type: 'ALLOWED_TRANSPORTS' },
      autoRestartEnabled: { restartRequired: false, type: 'BOOLEAN' },
      autoUpdateMode: { restartRequired: true, type: 'AUTO_UPDATE_MODE' },
      listenPort: { restartRequired: true, type: 'INTEGER' },
      minBlockchainPeers: { restartRequired: false, type: 'INTEGER' },
      minDataPeers: { restartRequired: false, type: 'INTEGER' },
      minPeerVersion: { restartRequired: true, type: 'PEER_VERSION' },
      maxStorageCapacity: { restartRequired: false, type: 'LONG' },
      storagePolicy: { restartRequired: false, type: 'STORAGE_POLICY' },
    },
  };

  it('normalizes phase 1 setting values to Core-compatible patch values', () => {
    expect(normalizeEditableSettingValue('storagePolicy', 'ALL')).toBe('ALL');
    expect(normalizeEditableSettingValue('storagePolicy', 'BAD')).toBe('FOLLOWED_OR_VIEWED');
    expect(normalizeEditableSettingValue('qdnEnabled', true)).toBe(true);
    expect(normalizeEditableSettingValue('apiDocumentationEnabled', undefined)).toBe(false);
    expect(normalizeEditableSettingValue('allowedTransports', ['i2p', 'IP', 'TOR'])).toEqual(['I2P', 'IP']);
    expect(normalizeEditableSettingValue('allowedTransports', [])).toEqual(['IP', 'I2P']);
    expect(normalizeEditableSettingValue('autoUpdateMode', 'NOTIFY')).toBe('NOTIFY');
    expect(normalizeEditableSettingValue('autoUpdateMode', 'BAD')).toBe('OFF');
    expect(normalizeEditableSettingValue('autoRestartEnabled', undefined)).toBe(false);
    expect(normalizeEditableSettingValue('listenPort', '25000')).toBe(25000);
    expect(normalizeEditableSettingValue('listenPort', '65536')).toBe(null);
    expect(normalizeEditableSettingValue('minOutboundPeers', '0')).toBe(0);
    expect(normalizeEditableSettingValue('minBlockchainPeers', '3')).toBe(3);
    expect(normalizeEditableSettingValue('minDataPeers', '4')).toBe(4);
    expect(normalizeEditableSettingValue('minDataPeers', '0')).toBe(null);
    expect(normalizeEditableSettingValue('minPeerVersion', '1.3.0')).toBe('1.3.0');
    expect(normalizeEditableSettingValue('minPeerVersion', '1.3')).toBe(null);
    expect(normalizeEditableSettingValue('maxStorageCapacity', '1234567890123')).toBe(1234567890123);
    expect(normalizeEditableSettingValue('chatMessageRetentionPeriod', '172800000')).toBe(172800000);
    expect(normalizeEditableSettingValue('maxStorageCapacity', '123.5')).toBe(null);
  });

  it('maps transport dropdown selections to ordered Core transport arrays', () => {
    expect(getTransportSelectionValue(['IP'])).toBe('IP');
    expect(getTransportSelectionValue(['IP', 'I2P'])).toBe('IP+I2P');
    expect(getTransportSelectionValue(['I2P', 'IP'])).toBe('I2P+IP');
    expect(getTransportSelectionValue(['I2P'])).toBe('I2P');
    expect(getTransportSelectionTransports('I2P+IP')).toEqual(['I2P', 'IP']);
  });

  it('formats and parses user-facing storage and chat retention units', () => {
    expect(formatBytesAsGigabytes(1_000_000_000)).toBe('1');
    expect(formatBytesAsGigabytes(1_500_000_000)).toBe('1.5');
    expect(parseGigabytesToBytes('2')).toBe(2_000_000_000);
    expect(parseGigabytesToBytes('')).toBe('');
    expect(parseGigabytesToBytes('1.5')).toBe(1_500_000_000);

    expect(formatMillisecondsAsHours(86_400_000)).toBe('24');
    expect(formatMillisecondsAsHours(5_400_000)).toBe('1.5');
    expect(parseHoursToMilliseconds('48')).toBe(172_800_000);
    expect(parseHoursToMilliseconds('')).toBe('');
    expect(parseHoursToMilliseconds('1.5')).toBe(5_400_000);
  });

  it('returns draft values over current Core settings', () => {
    expect(getEditableSettingValue('storagePolicy', { storagePolicy: 'VIEWED' }, {})).toBe('VIEWED');
    expect(getEditableSettingValue('storagePolicy', { storagePolicy: 'VIEWED' }, { storagePolicy: 'NONE' })).toBe('NONE');
  });

  it('builds a minimal settings patch from edited values', () => {
    const patch = buildSettingsPatch(
      {
        allowedTransports: ['IP', 'I2P'],
        autoUpdateMode: 'OFF',
        listenPort: 25000,
        minPeerVersion: '1.2.3',
        minDataPeers: 3,
        maxStorageCapacity: 1_000_000_000,
        chatMessageRetentionPeriod: 86_400_000,
        qdnEnabled: true,
        storagePolicy: 'FOLLOWED_OR_VIEWED',
      },
      {
        allowedTransports: ['I2P', 'IP'],
        autoUpdateMode: 'NOTIFY',
        listenPort: '25001',
        minPeerVersion: '1.3.0',
        minDataPeers: '4',
        maxStorageCapacity: parseGigabytesToBytes('2'),
        chatMessageRetentionPeriod: parseHoursToMilliseconds('48'),
        qdnEnabled: true,
        storagePolicy: 'NONE',
      },
    );

    expect(patch).toEqual({
      allowedTransports: ['I2P', 'IP'],
      autoUpdateMode: 'NOTIFY',
      chatMessageRetentionPeriod: 172800000,
      listenPort: 25001,
      maxStorageCapacity: 2000000000,
      minPeerVersion: '1.3.0',
      minDataPeers: 4,
      storagePolicy: 'NONE',
    });
  });

  it('requires Home update action, local mode, and writable metadata before enabling a setting', () => {
    expect(canEditSetting('storagePolicy', metadata, true, false)).toBe(true);
    expect(canEditSetting('autoUpdateMode', metadata, true, false)).toBe(true);
    expect(canEditSetting('autoRestartEnabled', metadata, true, false)).toBe(true);
    expect(canEditSetting('listenPort', metadata, true, false)).toBe(true);
    expect(canEditSetting('minBlockchainPeers', metadata, true, false)).toBe(true);
    expect(canEditSetting('minDataPeers', metadata, true, false)).toBe(true);
    expect(canEditSetting('minPeerVersion', metadata, true, false)).toBe(true);
    expect(canEditSetting('maxStorageCapacity', metadata, true, false)).toBe(true);
    expect(canEditSetting('storagePolicy', metadata, false, false)).toBe(false);
    expect(canEditSetting('storagePolicy', metadata, true, true)).toBe(false);
    expect(canEditSetting('qdnEnabled', metadata, true, false)).toBe(false);
    expect(canEditSetting('apiLoggingEnabled', metadata, true, false)).toBe(false);
  });

  it('detects restart-required settings in a patch', () => {
    expect(patchHasRestartRequiredSettings({ storagePolicy: 'NONE' }, metadata)).toBe(false);
    expect(patchHasRestartRequiredSettings({ allowedTransports: ['IP'] }, metadata)).toBe(true);
  });
});
