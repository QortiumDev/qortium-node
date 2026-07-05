import type { CoreSettings, CoreSettingsMetadata } from './types';

export const STORAGE_POLICY_OPTIONS = [
  'FOLLOWED_OR_VIEWED',
  'FOLLOWED',
  'VIEWED',
  'ALL',
  'NONE',
] as const;

export const TRANSPORT_OPTIONS = ['IP', 'I2P'] as const;
export const TRANSPORT_SELECTION_OPTIONS = [
  { label: 'IP', transports: ['IP'] },
  { label: 'IP + I2P', transports: ['IP', 'I2P'] },
  { label: 'I2P + IP', transports: ['I2P', 'IP'] },
  { label: 'I2P', transports: ['I2P'] },
] as const;
export const AUTO_UPDATE_MODE_OPTIONS = ['OFF', 'CHECK_ONLY', 'NOTIFY', 'INSTALL'] as const;
export const STORAGE_CAPACITY_GIGABYTE_BYTES = 1_000_000_000;
export const CHAT_RETENTION_HOUR_MS = 60 * 60 * 1000;

const NUMERIC_EDITABLE_SETTING_CONSTRAINTS = {
  listenPort: { max: 65535, min: 1 },
  listenDataPort: { max: 65535, min: 1 },
  maxPeers: { min: 1 },
  maxDataPeers: { min: 1 },
  minOutboundPeers: { min: 0 },
  minBlockchainPeers: { min: 1 },
  maxStorageCapacity: { min: 1 },
  chatMessageRetentionPeriod: { min: 1 },
} as const;

// Keep this in the same logical order as the read-only Core settings view's
// SETTING_ORDER, so the editable section remains a pulled-out version of the
// original full settings list instead of a separate appended list.
export const PHASE_1_EDITABLE_SETTING_KEYS = [
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
  'privateDataEnabled',
  'relayModeEnabled',
  'qdnPushOnPublishEnabled',
  'apiDocumentationEnabled',
  'chatMessageRetentionPeriod',
] as const;

export type Phase1EditableSettingKey = typeof PHASE_1_EDITABLE_SETTING_KEYS[number];
export type SettingsDraft = Partial<Record<Phase1EditableSettingKey, unknown>>;
export type SettingsPatch = Partial<Record<Phase1EditableSettingKey, unknown>>;

const EDITABLE_SETTING_KEY_SET = new Set<string>(PHASE_1_EDITABLE_SETTING_KEYS);
const NUMERIC_EDITABLE_SETTING_KEY_SET = new Set<string>(Object.keys(NUMERIC_EDITABLE_SETTING_CONSTRAINTS));

type BooleanEditableSettingKey = Exclude<
  Phase1EditableSettingKey,
  | 'allowedTransports'
  | 'autoUpdateMode'
  | 'chatMessageRetentionPeriod'
  | 'listenPort'
  | 'listenDataPort'
  | 'minBlockchainPeers'
  | 'minOutboundPeers'
  | 'minPeerVersion'
  | 'maxPeers'
  | 'maxDataPeers'
  | 'maxStorageCapacity'
  | 'storagePolicy'
>;

const BOOLEAN_DEFAULTS: Record<BooleanEditableSettingKey, boolean> = {
  allowConnectionsWithOlderPeerVersions: false,
  apiDocumentationEnabled: false,
  autoRestartEnabled: false,
  privateDataEnabled: true,
  publicDataEnabled: true,
  qdnEnabled: true,
  qdnPushOnPublishEnabled: true,
  relayModeEnabled: true,
};

export function isPhase1EditableSetting(key: string): key is Phase1EditableSettingKey {
  return EDITABLE_SETTING_KEY_SET.has(key);
}

export function isNumericEditableSetting(key: string): key is NumericEditableSettingKey {
  return NUMERIC_EDITABLE_SETTING_KEY_SET.has(key);
}

export function canEditSetting(
  key: string,
  metadata: CoreSettingsMetadata | null,
  hasUpdateAction: boolean,
  isPublicNode: boolean | null,
) {
  return (
    isPhase1EditableSetting(key) &&
    hasUpdateAction &&
    isPublicNode !== true &&
    !!metadata?.writable?.[key]
  );
}

export function normalizeEditableSettingValue(key: Phase1EditableSettingKey, value: unknown) {
  if (key === 'allowedTransports') {
    return normalizeTransportList(value);
  }

  if (key === 'storagePolicy') {
    return normalizeStoragePolicy(value);
  }

  if (key === 'autoUpdateMode') {
    return normalizeAutoUpdateMode(value);
  }

  if (key === 'minPeerVersion') {
    return normalizePeerVersion(value);
  }

  if (isNumericEditableSetting(key)) {
    return normalizeNumericSettingValue(key, value);
  }

  return typeof value === 'boolean' ? value : BOOLEAN_DEFAULTS[key];
}

export function getEditableSettingValue(
  key: Phase1EditableSettingKey,
  settings: CoreSettings | null,
  draft: SettingsDraft,
) {
  return normalizeEditableSettingValue(
    key,
    Object.prototype.hasOwnProperty.call(draft, key) ? draft[key] : settings?.[key],
  );
}

export function buildSettingsPatch(settings: CoreSettings | null, draft: SettingsDraft): SettingsPatch {
  const patch: SettingsPatch = {};

  if (!settings) {
    return patch;
  }

  for (const key of PHASE_1_EDITABLE_SETTING_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(draft, key)) {
      continue;
    }

    const currentValue = normalizeEditableSettingValue(key, settings[key]);
    const draftValue = normalizeEditableSettingValue(key, draft[key]);

    if ((isNumericEditableSetting(key) || key === 'minPeerVersion') && draftValue === null) {
      continue;
    }

    if (!settingsValuesEqual(currentValue, draftValue)) {
      patch[key] = draftValue;
    }
  }

  return patch;
}

export function patchHasRestartRequiredSettings(patch: SettingsPatch, metadata: CoreSettingsMetadata | null) {
  return Object.keys(patch).some((key) => metadata?.writable?.[key]?.restartRequired === true);
}

export function getTransportSelectionValue(value: unknown) {
  const transports = normalizeTransportList(value);
  const serializedTransports = transports.join('+');

  return TRANSPORT_SELECTION_OPTIONS.some((option) => option.transports.join('+') === serializedTransports)
    ? serializedTransports
    : 'IP+I2P';
}

export function getTransportSelectionTransports(value: string) {
  return (
    TRANSPORT_SELECTION_OPTIONS.find((option) => option.transports.join('+') === value)?.transports ??
    TRANSPORT_SELECTION_OPTIONS[1].transports
  );
}

export function formatBytesAsGigabytes(value: unknown) {
  return formatCoreUnitInputValue(value, STORAGE_CAPACITY_GIGABYTE_BYTES);
}

export function parseGigabytesToBytes(value: unknown) {
  return parseCoreUnitInputValue(value, STORAGE_CAPACITY_GIGABYTE_BYTES);
}

export function formatMillisecondsAsHours(value: unknown) {
  return formatCoreUnitInputValue(value, CHAT_RETENTION_HOUR_MS);
}

export function parseHoursToMilliseconds(value: unknown) {
  return parseCoreUnitInputValue(value, CHAT_RETENTION_HOUR_MS);
}

function normalizeTransportList(value: unknown) {
  const requested = Array.isArray(value)
    ? value
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim().toUpperCase())
    : [...TRANSPORT_OPTIONS];
  const transports: typeof TRANSPORT_OPTIONS[number][] = [];

  for (const transport of requested) {
    if (
      TRANSPORT_OPTIONS.includes(transport as typeof TRANSPORT_OPTIONS[number]) &&
      !transports.includes(transport as typeof TRANSPORT_OPTIONS[number])
    ) {
      transports.push(transport as typeof TRANSPORT_OPTIONS[number]);
    }
  }

  return transports.length ? transports : [...TRANSPORT_OPTIONS];
}

function normalizeStoragePolicy(value: unknown) {
  return typeof value === 'string' && STORAGE_POLICY_OPTIONS.includes(value as typeof STORAGE_POLICY_OPTIONS[number])
    ? value
    : 'FOLLOWED_OR_VIEWED';
}

function normalizeAutoUpdateMode(value: unknown) {
  return typeof value === 'string' && AUTO_UPDATE_MODE_OPTIONS.includes(value as typeof AUTO_UPDATE_MODE_OPTIONS[number])
    ? value
    : 'OFF';
}

function normalizePeerVersion(value: unknown) {
  const valueString = typeof value === 'string' ? value.trim() : '';
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(valueString);

  if (!match) {
    return null;
  }

  const parts = match.slice(1).map(Number);
  if (parts.some((part) => !Number.isSafeInteger(part) || part > 32767)) {
    return null;
  }

  return valueString;
}

type NumericEditableSettingKey = keyof typeof NUMERIC_EDITABLE_SETTING_CONSTRAINTS;

function normalizeNumericSettingValue(key: NumericEditableSettingKey, value: unknown) {
  const valueString = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : '';

  if (!/^\d+$/.test(valueString)) {
    return null;
  }

  const parsedValue = Number(valueString);
  const constraints = NUMERIC_EDITABLE_SETTING_CONSTRAINTS[key];

  if (!Number.isSafeInteger(parsedValue) || parsedValue < constraints.min) {
    return null;
  }

  if ('max' in constraints && parsedValue > constraints.max) {
    return null;
  }

  return parsedValue;
}

function formatCoreUnitInputValue(value: unknown, unitSize: number) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) {
    return '';
  }

  const unitValue = value / unitSize;

  return Number.isInteger(unitValue)
    ? String(unitValue)
    : unitValue.toFixed(3).replace(/\.?0+$/, '');
}

function parseCoreUnitInputValue(value: unknown, unitSize: number) {
  const valueString = typeof value === 'number' ? String(value) : typeof value === 'string' ? value.trim() : '';

  if (!valueString) {
    return '';
  }

  if (!/^(?:\d+|\d+\.\d{1,3})$/.test(valueString)) {
    return null;
  }

  const parsedValue = Number(valueString);
  const coreValue = Math.round(parsedValue * unitSize);

  return Number.isSafeInteger(coreValue) && coreValue >= unitSize ? coreValue : null;
}

function settingsValuesEqual(left: unknown, right: unknown) {
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((value, index) => value === right[index]);
  }

  return left === right;
}
