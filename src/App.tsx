import { useEffect, useMemo, useState } from 'react';
import { APP_VERSION } from './appVersion';
import nodeIconUrl from './assets/brand/qortium-node-protoicon-black-transparent.png';
import {
  applyCoreLanguage,
  applyDisplaySettings,
  getDisplaySettingsFromMessage,
  getInitialDisplaySettings,
} from './displaySettings';
import { createTranslator, type MessageKey, type TranslateFunction } from './i18n';
import {
  buildPeerBreakdown,
  buildPeerRows,
  formatBoolean,
  formatMaybeNumber,
  getPeerDiagnosticReasonEntries,
  getResponseData,
  normalizePeerDiagnostics,
  normalizePeerList,
} from './nodeData';
import {
  getNextPeerSortRules,
  sortPeerRows,
  type PeerSortColumn,
  type PeerSortRule,
} from './peerSorting';
import { getBridgeState, qdnRequest } from './qdnRequest';
import {
  buildSettingsPatch,
  canEditSetting,
  formatBytesAsGigabytes,
  formatMillisecondsAsHours,
  getEditableSettingValue,
  getTransportSelectionTransports,
  getTransportSelectionValue,
  AUTO_UPDATE_MODE_OPTIONS,
  isPhase1EditableSetting,
  isNumericEditableSetting,
  parseGigabytesToBytes,
  parseHoursToMilliseconds,
  patchHasRestartRequiredSettings,
  STORAGE_POLICY_OPTIONS,
  TRANSPORT_SELECTION_OPTIONS,
  type Phase1EditableSettingKey,
  type SettingsDraft,
  type SettingsPatch,
} from './settingsEditor';
import { buildSettingsGroups, normalizeSettingsMetadata, type SettingsEntry } from './settingsView';
import type {
  BridgeState,
  ConnectedPeer,
  CoreSettings,
  CoreSettingsMetadata,
  CoreSettingsUpdateResult,
  DisplaySettings,
  KnownPeerDiagnostics,
  NodeInfo,
  NodeStatus,
  PeerDirection,
  PeerKind,
  PeerTableRow,
  PeerTransport,
} from './types';

const SETTINGS_BRIDGE_ACTIONS = ['GET_NODE_SETTINGS_METADATA', 'UPDATE_NODE_SETTINGS', 'RESTART_NODE'];

type AppPage = 'overview' | 'settings';

type PeerColumnDefinition = {
  column: PeerSortColumn;
  labelKey: MessageKey;
};

const CHAIN_PEER_TABLE_COLUMNS: PeerColumnDefinition[] = [
  { column: 'transport', labelKey: 'label.transport' },
  { column: 'direction', labelKey: 'label.direction' },
  { column: 'address', labelKey: 'label.address' },
  { column: 'nodeId', labelKey: 'label.nodeId' },
  { column: 'version', labelKey: 'label.version' },
  { column: 'lastHeight', labelKey: 'label.height' },
  { column: 'lastPing', labelKey: 'label.ping' },
  { column: 'age', labelKey: 'label.age' },
];

const DATA_PEER_TABLE_COLUMNS: PeerColumnDefinition[] = [
  { column: 'transport', labelKey: 'label.transport' },
  { column: 'direction', labelKey: 'label.direction' },
  { column: 'address', labelKey: 'label.address' },
  { column: 'nodeId', labelKey: 'label.nodeId' },
  { column: 'version', labelKey: 'label.version' },
  { column: 'lastAccessed', labelKey: 'label.lastUsed' },
  { column: 'age', labelKey: 'label.age' },
];

function getStatusLabel(status: NodeStatus | null, t: TranslateFunction) {
  if (!status) {
    return t('common.unknown');
  }

  if (typeof status.syncPercent === 'number') {
    return t('message.syncedPercent', {
      percent: status.syncPercent,
      phase: status.syncPhase ?? t('label.sync'),
    });
  }

  return status.syncPhase ?? t('common.unknown');
}

function getMissingActions(actions: string[]) {
  const availableActions = new Set(actions);

  return SETTINGS_BRIDGE_ACTIONS.filter((action) => !availableActions.has(action));
}

async function fetchNodeData<T>(path: string, fallback: T): Promise<T> {
  const result = await qdnRequest<unknown>({
    action: 'FETCH_NODE_API',
    maxBytes: 1024 * 1024,
    path,
  });

  return getResponseData<T>(result, fallback);
}

async function fetchSettingsMetadata(): Promise<CoreSettingsMetadata | null> {
  try {
    const result = await qdnRequest<unknown>({
      action: 'GET_NODE_SETTINGS_METADATA',
      maxBytes: 256 * 1024,
    });

    return normalizeSettingsMetadata(getResponseData<unknown | null>(result, null));
  } catch {
    try {
      return normalizeSettingsMetadata(await fetchNodeData<unknown | null>('/admin/settings/metadata', null));
    } catch {
      return null;
    }
  }
}

async function fetchPeerDiagnostics(path: string): Promise<KnownPeerDiagnostics | null> {
  return normalizePeerDiagnostics(await fetchNodeData<unknown | null>(path, null));
}

function getFormatLabels(t: TranslateFunction) {
  return {
    empty: '-',
    idle: t('common.idle'),
    no: t('common.no'),
    timeAgo: (age: string) => t('message.timeAgo', { age }),
    unknown: t('common.unknown'),
    yes: t('common.yes'),
  };
}

function getKindLabel(kind: PeerKind, t: TranslateFunction) {
  return kind === 'chain' ? t('label.chain') : t('label.qdnData');
}

function getDirectionLabel(direction: PeerDirection, t: TranslateFunction) {
  if (direction === 'inbound') {
    return t('label.incoming');
  }

  if (direction === 'outbound') {
    return t('label.outgoing');
  }

  return t('common.unknown');
}

function getTransportLabel(transport: PeerTransport, t: TranslateFunction) {
  if (transport === 'ip') {
    return t('label.ip');
  }

  if (transport === 'i2p') {
    return t('label.i2p');
  }

  return t('common.unknown');
}

function formatDiagnosticReason(reason: string) {
  return reason
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function formatDiagnosticReasons(diagnostics: KnownPeerDiagnostics | null, t: TranslateFunction) {
  const entries = getPeerDiagnosticReasonEntries(diagnostics);

  return entries.length
    ? entries.map(([reason, count]) => `${formatDiagnosticReason(reason)} (${count})`).join(', ')
    : t('common.none');
}

function formatDiagnosticNumber(value: number | null | undefined, t: TranslateFunction) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : t('common.unknown');
}

function Metric({ labelKey, value, t }: { labelKey: MessageKey; value: string | number; t: TranslateFunction }) {
  return (
    <article className="metric">
      <span>{t(labelKey)}</span>
      <strong>{value}</strong>
    </article>
  );
}

function DiagnosticStat({ labelKey, value, t }: { labelKey: MessageKey; value: string | number; t: TranslateFunction }) {
  return (
    <div>
      <dt>{t(labelKey)}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function BreakdownTable({
  chainPeers,
  dataPeers,
  t,
}: {
  chainPeers: ConnectedPeer[];
  dataPeers: ConnectedPeer[];
  t: TranslateFunction;
}) {
  const breakdown = useMemo(() => buildPeerBreakdown(chainPeers, dataPeers), [chainPeers, dataPeers]);

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{t('label.peerBreakdown')}</h2>
      </div>
      <div className="breakdown-grid">
        <Metric labelKey="label.totalPeerSockets" value={breakdown.total} t={t} />
        <Metric labelKey="label.distinctNodeIds" value={breakdown.distinctNodeIds} t={t} />
        <Metric labelKey="label.nodeIdsOnBothNetworks" value={breakdown.duplicatedNodeIds} t={t} />
      </div>
      <table>
        <thead>
          <tr>
            <th>{t('label.network')}</th>
            <th>{t('label.total')}</th>
            <th>{t('label.ip')}</th>
            <th>{t('label.i2p')}</th>
            <th>{t('label.incoming')}</th>
            <th>{t('label.outgoing')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{t('label.chain')}</td>
            <td>{breakdown.chain.total}</td>
            <td>{breakdown.chain.ip}</td>
            <td>{breakdown.chain.i2p}</td>
            <td>{breakdown.chain.inbound}</td>
            <td>{breakdown.chain.outbound}</td>
          </tr>
          <tr>
            <td>{t('label.qdnData')}</td>
            <td>{breakdown.data.total}</td>
            <td>{breakdown.data.ip}</td>
            <td>{breakdown.data.i2p}</td>
            <td>{breakdown.data.inbound}</td>
            <td>{breakdown.data.outbound}</td>
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function PeerDiagnosticsCard({
  diagnostics,
  showQdnFields = false,
  titleKey,
  t,
}: {
  diagnostics: KnownPeerDiagnostics | null;
  showQdnFields?: boolean;
  titleKey: MessageKey;
  t: TranslateFunction;
}) {
  return (
    <article className="diagnostics-card">
      <h3>{t(titleKey)}</h3>
      {diagnostics ? (
        <>
          <dl className="diagnostics-stats">
            <DiagnosticStat labelKey="label.known" value={diagnostics.knownCount} t={t} />
            <DiagnosticStat labelKey="label.connected" value={diagnostics.connectedCount} t={t} />
            <DiagnosticStat labelKey="label.handshaked" value={diagnostics.handshakedCount} t={t} />
            <DiagnosticStat labelKey="label.connectable" value={diagnostics.connectableCount} t={t} />
            <DiagnosticStat labelKey="label.backoff" value={diagnostics.backoffCount} t={t} />
            <DiagnosticStat
              labelKey="label.i2pSession"
              value={diagnostics.i2pSessionUp === undefined ? t('common.unknown') : formatBoolean(diagnostics.i2pSessionUp, { no: t('common.down'), unknown: t('common.unknown'), yes: t('common.up') })}
              t={t}
            />
            {showQdnFields ? (
              <DiagnosticStat
                labelKey="label.qdnFallbackCandidates"
                value={formatDiagnosticNumber(diagnostics.qdnFallbackCandidateCount, t)}
                t={t}
              />
            ) : null}
          </dl>
          <div className="diagnostics-reasons">
            <span>{t('label.reasonSummary')}</span>
            <strong>{formatDiagnosticReasons(diagnostics, t)}</strong>
          </div>
        </>
      ) : (
        <p className="panel-copy">{t('message.peerDiagnosticsUnavailable')}</p>
      )}
    </article>
  );
}

function getDataPeerDiagnosticMessage(
  diagnostics: KnownPeerDiagnostics | null,
  connectedDataPeerCount: number,
  t: TranslateFunction,
) {
  if (!diagnostics || connectedDataPeerCount > 0) {
    return '';
  }

  if (diagnostics.knownCount === 0) {
    return t('message.noKnownDataPeers');
  }

  if (diagnostics.i2pSessionUp === false) {
    return t('message.dataPeerI2pSessionDown', {
      reasons: formatDiagnosticReasons(diagnostics, t),
    });
  }

  if (diagnostics.connectableCount === 0) {
    return t('message.noConnectableDataPeers', {
      reasons: formatDiagnosticReasons(diagnostics, t),
    });
  }

  return t('message.connectableDataPeersAvailable', {
    count: diagnostics.connectableCount,
  });
}

function PeerDiagnosticsPanel({
  chainDiagnostics,
  dataDiagnostics,
  dataPeerCount,
  t,
}: {
  chainDiagnostics: KnownPeerDiagnostics | null;
  dataDiagnostics: KnownPeerDiagnostics | null;
  dataPeerCount: number;
  t: TranslateFunction;
}) {
  if (!chainDiagnostics && !dataDiagnostics) {
    return null;
  }

  const dataPeerMessage = getDataPeerDiagnosticMessage(dataDiagnostics, dataPeerCount, t);

  return (
    <section className="panel diagnostics-panel">
      <div className="panel-heading">
        <h2>{t('label.peerDiagnostics')}</h2>
      </div>
      {dataPeerMessage ? <div className="notice">{dataPeerMessage}</div> : null}
      <div className="diagnostics-grid">
        <PeerDiagnosticsCard diagnostics={chainDiagnostics} titleKey="label.chain" t={t} />
        <PeerDiagnosticsCard diagnostics={dataDiagnostics} showQdnFields titleKey="label.qdnData" t={t} />
      </div>
    </section>
  );
}

function PeerTable({
  columns,
  onSort,
  rows,
  sortRules,
  titleKey,
  t,
}: {
  columns: PeerColumnDefinition[];
  onSort: (column: PeerSortColumn) => void;
  rows: PeerTableRow[];
  sortRules: PeerSortRule[];
  titleKey: MessageKey;
  t: TranslateFunction;
}) {
  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>{t(titleKey)}</h2>
        <span>{t('message.sockets', { count: rows.length })}</span>
      </div>
      <table className="peer-table">
        <thead>
          <tr>
            {columns.map(({ column, labelKey }) => {
              const sortIndex = sortRules.findIndex((rule) => rule.column === column);
              const sortRule = sortIndex >= 0 ? sortRules[sortIndex] : null;
              const ariaSort = sortIndex === 0 ? (sortRule?.direction === 'desc' ? 'descending' : 'ascending') : 'none';

              return (
                <th key={column} aria-sort={ariaSort}>
                  <button type="button" className="sort-header" onClick={() => onSort(column)}>
                    <span>{t(labelKey)}</span>
                    <span className="sort-header__indicator" aria-hidden="true">
                      {sortRule ? `${sortRule.direction === 'asc' ? '^' : 'v'}${sortIndex + 1}` : ''}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${row.kind}:${row.address}:${row.nodeId}:${index}`}>
              {columns.map(({ column }) => (
                <td key={column} data-column={column}>
                  {getPeerCellValue(row, column, t)}
                </td>
              ))}
            </tr>
          ))}
          {!rows.length ? (
            <tr>
              <td colSpan={columns.length}>{t('message.noConnectedPeers')}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </section>
  );
}

function getPeerCellValue(row: PeerTableRow, column: PeerSortColumn, t: TranslateFunction) {
  if (column === 'kind') {
    return getKindLabel(row.kind, t);
  }

  if (column === 'transport') {
    return getTransportLabel(row.transport, t);
  }

  if (column === 'direction') {
    return getDirectionLabel(row.direction, t);
  }

  return row[column];
}

function DetailsItem({ labelKey, value, t }: { labelKey: MessageKey; value: string; t: TranslateFunction }) {
  return (
    <div>
      <dt>{t(labelKey)}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function formatSettingsList(values: string[] | undefined, t: TranslateFunction) {
  return values?.length ? values.join(', ') : t('common.none');
}

function getActionSet(bridgeState: BridgeState | null) {
  return new Set(bridgeState?.actions ?? []);
}

function SettingsEntryStatus({
  entry,
  settingsPatch,
  t,
}: {
  entry: SettingsEntry;
  settingsPatch: SettingsPatch;
  t: TranslateFunction;
}) {
  const status = Object.prototype.hasOwnProperty.call(settingsPatch, entry.key)
    ? t('label.save')
    : entry.pendingRestart || entry.fileChanged
      ? t('label.restart')
      : '';

  return status ? (
    <div className="setting-badges">
      <span className="setting-badge">{status}</span>
    </div>
  ) : (
    '-'
  );
}

function SettingsValueControl({
  coreSettings,
  draft,
  editable,
  entry,
  onChange,
  t,
}: {
  coreSettings: CoreSettings | null;
  draft: SettingsDraft;
  editable: boolean;
  entry: SettingsEntry;
  onChange: (key: Phase1EditableSettingKey, value: unknown) => void;
  t: TranslateFunction;
}) {
  if (!isPhase1EditableSetting(entry.key)) {
    return entry.value;
  }

  const settingKey = entry.key;
  const value = getEditableSettingValue(settingKey, coreSettings, draft);

  if (settingKey === 'maxStorageCapacity') {
    const draftValue = Object.prototype.hasOwnProperty.call(draft, settingKey) ? draft[settingKey] : undefined;
    const inputValue = draftValue !== undefined
      ? formatBytesAsGigabytes(draftValue)
      : formatBytesAsGigabytes(value);

    return (
      <div className="unit-control">
        <input
          className="setting-control"
          disabled={!editable}
          inputMode="decimal"
          min="1"
          onChange={(event) => onChange(settingKey, parseGigabytesToBytes(event.target.value))}
          pattern="[0-9]*(?:\\.[0-9]{1,3})?"
          type="text"
          value={inputValue}
        />
        <span>GB</span>
      </div>
    );
  }

  if (settingKey === 'chatMessageRetentionPeriod') {
    const draftValue = Object.prototype.hasOwnProperty.call(draft, settingKey) ? draft[settingKey] : undefined;
    const inputValue = draftValue !== undefined
      ? formatMillisecondsAsHours(draftValue)
      : formatMillisecondsAsHours(value);

    return (
      <div className="unit-control">
        <input
          className="setting-control"
          disabled={!editable}
          inputMode="decimal"
          min="1"
          onChange={(event) => onChange(settingKey, parseHoursToMilliseconds(event.target.value))}
          pattern="[0-9]*(?:\\.[0-9]{1,3})?"
          type="text"
          value={inputValue}
        />
        <span>{t('label.hours')}</span>
      </div>
    );
  }

  if (isNumericEditableSetting(settingKey)) {
    const draftValue = Object.prototype.hasOwnProperty.call(draft, settingKey) ? draft[settingKey] : undefined;
    const inputValue = draftValue !== undefined
      ? String(draftValue ?? '')
      : typeof value === 'number'
        ? String(value)
        : '';

    return (
      <input
        className="setting-control"
        disabled={!editable}
        inputMode="numeric"
        onChange={(event) => onChange(settingKey, event.target.value)}
        pattern="[0-9]*"
        type="text"
        value={inputValue}
      />
    );
  }

  if (settingKey === 'allowedTransports') {
    return (
      <select
        className="setting-control"
        disabled={!editable}
        onChange={(event) => onChange(settingKey, [...getTransportSelectionTransports(event.target.value)])}
        value={getTransportSelectionValue(value)}
      >
        {TRANSPORT_SELECTION_OPTIONS.map((option) => (
          <option key={option.transports.join('+')} value={option.transports.join('+')}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  if (settingKey === 'storagePolicy') {
    return (
      <select
        className="setting-control"
        disabled={!editable}
        onChange={(event) => onChange(settingKey, event.target.value)}
        value={typeof value === 'string' ? value : 'FOLLOWED_OR_VIEWED'}
      >
        {STORAGE_POLICY_OPTIONS.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    );
  }

  if (settingKey === 'autoUpdateMode') {
    return (
      <select
        className="setting-control"
        disabled={!editable}
        onChange={(event) => onChange(settingKey, event.target.value)}
        value={typeof value === 'string' ? value : 'OFF'}
      >
        {AUTO_UPDATE_MODE_OPTIONS.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    );
  }

  if (settingKey === 'minPeerVersion') {
    const draftValue = Object.prototype.hasOwnProperty.call(draft, settingKey) ? draft[settingKey] : undefined;
    const inputValue = draftValue !== undefined
      ? String(draftValue ?? '')
      : typeof value === 'string'
        ? value
        : '';

    return (
      <input
        className="setting-control"
        disabled={!editable}
        onChange={(event) => onChange(settingKey, event.target.value)}
        placeholder="1.3.0"
        type="text"
        value={inputValue}
      />
    );
  }

  return (
    <select
      className="setting-control"
      disabled={!editable}
      onChange={(event) => onChange(settingKey, event.target.value === 'true')}
      value={value === true ? 'true' : 'false'}
    >
      <option value="true">{t('common.yes')}</option>
      <option value="false">{t('common.no')}</option>
    </select>
  );
}

function CoreSettingsPage({
  bridgeState,
  coreSettings,
  draft,
  isPublicNode,
  onDraftChange,
  settingsPatch,
  settingsMetadata,
  t,
}: {
  bridgeState: BridgeState | null;
  coreSettings: CoreSettings | null;
  draft: SettingsDraft;
  isPublicNode: boolean | null;
  onDraftChange: (key: Phase1EditableSettingKey, value: unknown) => void;
  settingsPatch: SettingsPatch;
  settingsMetadata: CoreSettingsMetadata | null;
  t: TranslateFunction;
}) {
  const missingActions = getMissingActions(bridgeState?.actions ?? []);
  const actionSet = getActionSet(bridgeState);
  const hasUpdateAction = actionSet.has('UPDATE_NODE_SETTINGS');
  const isEditorAvailable = hasUpdateAction && isPublicNode !== true;
  const settingsGroups = buildSettingsGroups(coreSettings, settingsMetadata);
  const settingsCount = settingsGroups.reduce((count, group) => count + group.entries.length, 0);
  const writableCount = settingsMetadata?.writable ? Object.keys(settingsMetadata.writable).length : null;

  return (
    <>
      <section className="panel">
        <div className="panel-heading">
          <h2>{t('label.coreSettings')}</h2>
          <span>{isEditorAvailable ? t('common.editable') : t('common.readOnly')}</span>
        </div>
        <p className="panel-copy">{t('message.settingsReadOnly')}</p>
        <dl className="details">
          <DetailsItem
            labelKey="label.publicNetworkMode"
            value={isPublicNode === null ? t('common.unknown') : isPublicNode ? t('common.blocked') : t('common.notPublic')}
            t={t}
          />
          <DetailsItem
            labelKey="label.futureBridgeActions"
            value={SETTINGS_BRIDGE_ACTIONS.join(', ')}
            t={t}
          />
          <DetailsItem
            labelKey="label.missingNow"
            value={missingActions.length ? missingActions.join(', ') : t('common.none')}
            t={t}
          />
          <DetailsItem
            labelKey="label.settingsFile"
            value={settingsMetadata?.settingsPath ?? t('common.unknown')}
            t={t}
          />
          <DetailsItem
            labelKey="label.writableSettings"
            value={writableCount === null ? t('common.unknown') : String(writableCount)}
            t={t}
          />
          <DetailsItem
            labelKey="label.savedChanges"
            value={
              settingsMetadata?.fileComparisonError ??
              formatSettingsList(settingsMetadata?.fileChanged, t)
            }
            t={t}
          />
          <DetailsItem
            labelKey="label.pendingRestart"
            value={formatSettingsList(settingsMetadata?.pendingRestart, t)}
            t={t}
          />
        </dl>
      </section>

      {settingsGroups.length ? (
        settingsGroups.map((group, index) => (
          <section className="panel settings-section" key={group.id}>
            {index === 0 ? (
              <div className="panel-heading">
                <h2>{t('label.coreSettings')}</h2>
                <span>{settingsCount}</span>
              </div>
            ) : null}
            <table className="settings-table">
              <thead>
                <tr>
                  <th>{t('label.setting')}</th>
                  <th>{t('label.value')}</th>
                  <th>{t('label.status')}</th>
                </tr>
              </thead>
              <tbody>
                {group.entries.map((entry) => (
                  <tr
                    className={
                      Object.prototype.hasOwnProperty.call(settingsPatch, entry.key) ||
                      entry.pendingRestart ||
                      entry.fileChanged
                        ? 'settings-row--attention'
                        : undefined
                    }
                    key={entry.key}
                  >
                    <td>{entry.key}</td>
                    <td>
                      <SettingsValueControl
                        coreSettings={coreSettings}
                        draft={draft}
                        editable={canEditSetting(entry.key, settingsMetadata, hasUpdateAction, isPublicNode)}
                        entry={entry}
                        onChange={onDraftChange}
                        t={t}
                      />
                    </td>
                    <td><SettingsEntryStatus entry={entry} settingsPatch={settingsPatch} t={t} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))
      ) : (
        <section className="panel">
          <div className="panel-heading">
            <h2>{t('label.coreSettings')}</h2>
            <span>0</span>
          </div>
          <p className="panel-copy">{t('message.noSettingsReported')}</p>
        </section>
      )}
    </>
  );
}

export function App() {
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(() => getInitialDisplaySettings());
  const [bridgeState, setBridgeState] = useState<BridgeState | null>(null);
  const [nodeStatus, setNodeStatus] = useState<NodeStatus | null>(null);
  const [nodeInfo, setNodeInfo] = useState<NodeInfo | null>(null);
  const [coreSettings, setCoreSettings] = useState<CoreSettings | null>(null);
  const [settingsMetadata, setSettingsMetadata] = useState<CoreSettingsMetadata | null>(null);
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft>({});
  const [settingsMessage, setSettingsMessage] = useState('');
  const [chainPeers, setChainPeers] = useState<ConnectedPeer[]>([]);
  const [dataPeers, setDataPeers] = useState<ConnectedPeer[]>([]);
  const [chainPeerDiagnostics, setChainPeerDiagnostics] = useState<KnownPeerDiagnostics | null>(null);
  const [dataPeerDiagnostics, setDataPeerDiagnostics] = useState<KnownPeerDiagnostics | null>(null);
  const [chainPeerSortRules, setChainPeerSortRules] = useState<PeerSortRule[]>([]);
  const [dataPeerSortRules, setDataPeerSortRules] = useState<PeerSortRule[]>([]);
  const [page, setPage] = useState<AppPage>('overview');
  const [isPublicNode, setIsPublicNode] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isRestartingNode, setIsRestartingNode] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [error, setError] = useState('');

  const t = useMemo(() => createTranslator(displaySettings.language), [displaySettings.language]);
  const formatLabels = useMemo(() => getFormatLabels(t), [t]);
  const actionSet = useMemo(() => getActionSet(bridgeState), [bridgeState]);
  const settingsPatch = useMemo(() => buildSettingsPatch(coreSettings, settingsDraft), [coreSettings, settingsDraft]);
  const hasSettingsChanges = Object.keys(settingsPatch).length > 0;
  const canSaveSettings = (
    hasSettingsChanges &&
    isPublicNode !== true &&
    actionSet.has('UPDATE_NODE_SETTINGS') &&
    !isSavingSettings &&
    !isRestartingNode
  );
  const canRestartNode = (
    isPublicNode !== true &&
    actionSet.has('RESTART_NODE') &&
    !isSavingSettings &&
    !isRestartingNode
  );
  const hasPendingRestart = (settingsMetadata?.pendingRestart ?? []).length > 0;
  const showRestartButton = hasPendingRestart || patchHasRestartRequiredSettings(settingsPatch, settingsMetadata);
  const chainPeerRows = useMemo(() => buildPeerRows('chain', chainPeers, formatLabels), [chainPeers, formatLabels]);
  const dataPeerRows = useMemo(() => buildPeerRows('data', dataPeers, formatLabels), [dataPeers, formatLabels]);
  const sortedChainPeerRows = useMemo(
    () => sortPeerRows(chainPeerRows, chainPeerSortRules),
    [chainPeerRows, chainPeerSortRules],
  );
  const sortedDataPeerRows = useMemo(
    () => sortPeerRows(dataPeerRows, dataPeerSortRules),
    [dataPeerRows, dataPeerSortRules],
  );

  function sortChainPeers(column: PeerSortColumn) {
    setChainPeerSortRules((currentRules) => getNextPeerSortRules(currentRules, column));
  }

  function sortDataPeers(column: PeerSortColumn) {
    setDataPeerSortRules((currentRules) => getNextPeerSortRules(currentRules, column));
  }

  function updateSettingsDraft(key: Phase1EditableSettingKey, value: unknown) {
    setSettingsDraft((currentDraft) => ({
      ...currentDraft,
      [key]: value,
    }));
    setSettingsMessage('');
  }

  async function refresh() {
    setIsLoading(true);
    setError('');

    try {
      const [
        state,
        status,
        publicNode,
        info,
        fetchedCoreSettings,
        fetchedSettingsMetadata,
        peers,
        dataNetworkPeers,
        fetchedChainPeerDiagnostics,
        fetchedDataPeerDiagnostics,
      ] = await Promise.all([
        getBridgeState(),
        qdnRequest<NodeStatus>({ action: 'GET_NODE_STATUS' }),
        qdnRequest<boolean>({ action: 'IS_USING_PUBLIC_NODE' }).catch(() => null),
        fetchNodeData<NodeInfo | null>('/admin/info', null).catch(() => null),
        fetchNodeData<CoreSettings | null>('/admin/settings', null).catch(() => null),
        fetchSettingsMetadata(),
        fetchNodeData<unknown[]>('/peers', []).catch(() => []),
        fetchNodeData<unknown[]>('/peers/data', []).catch(() => []),
        fetchPeerDiagnostics('/peers/known/diagnostics').catch(() => null),
        fetchPeerDiagnostics('/peers/data/known/diagnostics').catch(() => null),
      ]);

      setBridgeState(state);
      setNodeStatus(status);
      setIsPublicNode(publicNode);
      setNodeInfo(info);
      setCoreSettings(fetchedCoreSettings);
      setSettingsMetadata(fetchedSettingsMetadata);
      setSettingsDraft({});
      setDisplaySettings((current) => applyCoreLanguage(current, fetchedCoreSettings?.localeLang));
      setChainPeers(normalizePeerList(peers));
      setDataPeers(normalizePeerList(dataNetworkPeers));
      setChainPeerDiagnostics(fetchedChainPeerDiagnostics);
      setDataPeerDiagnostics(fetchedDataPeerDiagnostics);
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : String(refreshError));
    } finally {
      setHasLoadedData(true);
      setIsLoading(false);
    }
  }

  async function saveSettings() {
    if (!canSaveSettings) {
      return;
    }

    const patch: SettingsPatch = settingsPatch;
    setIsSavingSettings(true);
    setError('');
    setSettingsMessage('');

    try {
      const result = await qdnRequest<CoreSettingsUpdateResult>({
        action: 'UPDATE_NODE_SETTINGS',
        settings: patch,
      });
      const restartRequired = result.restartRequired?.length ? result.restartRequired : [];

      setSettingsMessage(
        restartRequired.length ? t('message.settingsSavedRestartRequired') : t('message.settingsSaved'),
      );
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : String(saveError));
    } finally {
      setIsSavingSettings(false);
    }
  }

  async function restartNode() {
    if (!canRestartNode) {
      return;
    }

    setIsRestartingNode(true);
    setError('');
    setSettingsMessage('');

    try {
      await qdnRequest<unknown>({ action: 'RESTART_NODE' });
      setSettingsMetadata((currentMetadata) => currentMetadata
        ? {
          ...currentMetadata,
          fileChanged: [],
          fileDiffersFromRuntime: false,
          pendingRestart: [],
        }
        : currentMetadata);
      setSettingsMessage(t('message.restartRequested'));
    } catch (restartError) {
      setError(restartError instanceof Error ? restartError.message : String(restartError));
    } finally {
      setIsRestartingNode(false);
    }
  }

  useEffect(() => {
    applyDisplaySettings(displaySettings);
  }, [displaySettings]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      setDisplaySettings((current) => getDisplaySettingsFromMessage(event.data, current) ?? current);
    };

    window.addEventListener('message', onMessage);

    return () => window.removeEventListener('message', onMessage);
  }, []);

  useEffect(() => {
    refresh();
  }, []);

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="topbar">
          <div className="brand">
            <span className="brand__mark">
              <img src={nodeIconUrl} alt="" aria-hidden="true" />
            </span>
            <div className="brand__copy">
              <h1>
                <span>{t('app.title')}</span>
                <span className="brand__version">v{APP_VERSION}</span>
              </h1>
            </div>
          </div>
          <div className="topbar__actions">
            {hasSettingsChanges && page === 'settings' ? (
              <button
                type="button"
                className={`action-button${isSavingSettings ? ' is-loading' : ''}`}
                disabled={!canSaveSettings}
                onClick={saveSettings}
                aria-busy={isSavingSettings}
              >
                {isSavingSettings ? <span className="button-spinner" aria-hidden="true" /> : null}
                <span>{t('label.save')}</span>
              </button>
            ) : null}
            {showRestartButton && page === 'settings' ? (
              <button
                type="button"
                className={`action-button${isRestartingNode ? ' is-loading' : ''}`}
                disabled={!canRestartNode}
                onClick={restartNode}
                aria-busy={isRestartingNode}
              >
                {isRestartingNode ? <span className="button-spinner" aria-hidden="true" /> : null}
                <span>{t('label.restart')}</span>
              </button>
            ) : null}
            <div className="tabs" role="tablist" aria-label={t('label.actions')}>
              <button
                type="button"
                className="tab-button"
                role="tab"
                aria-selected={page === 'overview'}
                onClick={() => setPage('overview')}
              >
                {t('label.nodeStatus')}
              </button>
              <button
                type="button"
                className="tab-button"
                role="tab"
                aria-selected={page === 'settings'}
                onClick={() => setPage('settings')}
              >
                {t('label.coreSettings')}
              </button>
            </div>
            <button
              type="button"
              className={`refresh-button${isLoading ? ' is-loading' : ''}`}
              onClick={refresh}
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? <span className="button-spinner" aria-hidden="true" /> : null}
              <span>{t('label.refresh')}</span>
            </button>
          </div>
        </header>

        {error ? <div className="notice">{error}</div> : null}
        {settingsMessage ? <div className="notice muted">{settingsMessage}</div> : null}
        {isLoading && !hasLoadedData ? <div className="notice muted">{t('message.loadingNodeData')}</div> : null}

        {page === 'overview' ? (
          <>
            <section className="status-grid">
              <Metric
                labelKey="label.runtime"
                value={bridgeState?.isHomeBridge ? bridgeState.ui : t('message.browserFallback')}
                t={t}
              />
              <Metric labelKey="label.sync" value={getStatusLabel(nodeStatus, t)} t={t} />
              <Metric labelKey="label.height" value={formatMaybeNumber(nodeStatus?.height, formatLabels)} t={t} />
              <Metric
                labelKey="label.chainPeers"
                value={formatMaybeNumber(nodeStatus?.numberOfConnections, formatLabels)}
                t={t}
              />
              <Metric
                labelKey="label.dataPeers"
                value={formatMaybeNumber(nodeStatus?.numberOfDataConnections, formatLabels)}
                t={t}
              />
              <Metric
                labelKey="label.mintingPossible"
                value={formatBoolean(nodeStatus?.isMintingPossible, formatLabels)}
                t={t}
              />
            </section>

            <section className="panel">
              <div className="panel-heading">
                <h2>{t('label.nodeStatus')}</h2>
                <span>{nodeInfo?.buildVersion ?? t('message.versionUnknown')}</span>
              </div>
              <dl className="details">
                <DetailsItem labelKey="label.nodeId" value={nodeInfo?.nodeId ?? t('common.unknown')} t={t} />
                <DetailsItem
                  labelKey="label.chainInboundReachable"
                  value={formatBoolean(nodeStatus?.isP2PInboundReachable, formatLabels)}
                  t={t}
                />
                <DetailsItem
                  labelKey="label.chainListenSocket"
                  value={formatBoolean(nodeStatus?.isP2PListenSocketAvailable, formatLabels)}
                  t={t}
                />
                <DetailsItem
                  labelKey="label.chainPortMapped"
                  value={formatBoolean(nodeStatus?.isP2PPortMapped, formatLabels)}
                  t={t}
                />
                <DetailsItem
                  labelKey="label.qdnInboundReachable"
                  value={formatBoolean(nodeStatus?.isQDNInboundReachable, formatLabels)}
                  t={t}
                />
                <DetailsItem
                  labelKey="label.qdnListenSocket"
                  value={formatBoolean(nodeStatus?.isQDNListenSocketAvailable, formatLabels)}
                  t={t}
                />
                <DetailsItem
                  labelKey="label.qdnPortMapped"
                  value={formatBoolean(nodeStatus?.isQDNPortMapped, formatLabels)}
                  t={t}
                />
                <DetailsItem
                  labelKey="label.remainingSyncBlocks"
                  value={formatMaybeNumber(nodeStatus?.syncBlocksRemaining, formatLabels)}
                  t={t}
                />
                <DetailsItem
                  labelKey="label.language"
                  value={`${displaySettings.language} (${displaySettings.languageSource})`}
                  t={t}
                />
              </dl>
            </section>

            <BreakdownTable chainPeers={chainPeers} dataPeers={dataPeers} t={t} />
            <PeerDiagnosticsPanel
              chainDiagnostics={chainPeerDiagnostics}
              dataDiagnostics={dataPeerDiagnostics}
              dataPeerCount={dataPeers.length}
              t={t}
            />
            <PeerTable
              columns={CHAIN_PEER_TABLE_COLUMNS}
              rows={sortedChainPeerRows}
              sortRules={chainPeerSortRules}
              onSort={sortChainPeers}
              titleKey="label.chainPeers"
              t={t}
            />
            <PeerTable
              columns={DATA_PEER_TABLE_COLUMNS}
              rows={sortedDataPeerRows}
              sortRules={dataPeerSortRules}
              onSort={sortDataPeers}
              titleKey="label.dataPeers"
              t={t}
            />
          </>
        ) : (
          <CoreSettingsPage
            bridgeState={bridgeState}
            coreSettings={coreSettings}
            draft={settingsDraft}
            isPublicNode={isPublicNode}
            onDraftChange={updateSettingsDraft}
            settingsPatch={settingsPatch}
            settingsMetadata={settingsMetadata}
            t={t}
          />
        )}
      </section>
    </main>
  );
}
