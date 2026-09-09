import { useState } from 'react';
import { copyTextToClipboard } from './clipboard';
import { ReferenceNavigation } from './ReferenceNavigation';
import { NODE_READ_PATHS, SETTINGS_BRIDGE_ACTIONS } from './nodeContract';
import { AUTO_UPDATE_MODE_OPTIONS, CHAT_RETENTION_HOUR_MS, PHASE_1_EDITABLE_SETTING_KEYS, STORAGE_CAPACITY_GIGABYTE_BYTES, STORAGE_POLICY_OPTIONS, TRANSPORT_SELECTION_OPTIONS } from './settingsEditor';

export const REFERENCE_SNIPPETS = {
  capabilities: `const actions = await qdnRequest({ action: 'SHOW_ACTIONS' });
const available = new Set(Array.isArray(actions) ? actions : []);
const required = ${JSON.stringify(SETTINGS_BRIDGE_ACTIONS)};
const missing = required.filter(action => !available.has(action));
const isPublic = await qdnRequest({ action: 'IS_USING_PUBLIC_NODE' });
// Missing actions or public mode mean read-only. Availability is not approval.
// Do not infer write authority from a URL, a settings field, or WHICH_UI.`,
  reads: `const status = await qdnRequest({ action: 'GET_NODE_STATUS' });
const response = await qdnRequest({
  action: 'FETCH_NODE_API', path: '/peers', maxBytes: 1024 * 1024,
});
// FETCH_NODE_API returns an HTTP envelope; check it before reading data.
if (!response.ok) throw new Error('Peer lookup failed: HTTP ' + response.status);
const peers = Array.isArray(response.data) ? response.data : [];
// Optional diagnostics can be unavailable; an empty fallback is not proof
// that Core has no peers or that every transport is healthy.`,
  metadata: `const response = await qdnRequest({ action: 'GET_NODE_SETTINGS_METADATA' });
const metadata = response && typeof response === 'object' && 'data' in response
  ? response.data : response;
// Normalize writable: either { key: { type, restartRequired } },
// { entry: [{ key, value: { type, restartRequired } }] }.
// Node's normalizeSettingsMetadata() handles these shapes.
// Intersect with the app's editable allowlist before rendering inputs.
const appEditableKeys = ${JSON.stringify(PHASE_1_EDITABLE_SETTING_KEYS)};`,
  units: `const bytesPerGB = ${STORAGE_CAPACITY_GIGABYTE_BYTES}; // decimal GB, not GiB
const millisecondsPerHour = ${CHAT_RETENTION_HOUR_MS};
const storageBytes = 2.5 * bytesPerGB;
const retentionMilliseconds = 24 * millisecondsPerHour;
// Node uses parseGigabytesToBytes / parseHoursToMilliseconds:
// require at least 1 displayed unit and at most 3 decimal places.
// Conversion rounds to an integer and rejects unsafe values.`,
  save: `// Define the operation; copying this example does not call it.
async function saveReviewedPatch(reviewedPatch) {
  // Use only changed, validated, metadata-writable and app-allowed keys.
  // Home presents its own current/proposed values and selected node approval.
  const result = await qdnRequest({
    action: 'UPDATE_NODE_SETTINGS', settings: reviewedPatch,
  });
  // result: { saved, applied, updated, removed, restartRequired }
  // Re-read settings and metadata. A saved restart-required value can still
  // differ from what restart-dependent services use. No automatic retry on ambiguous failure.
  return result;
}
// This is not a revision/CAS store: do not add expectedRevision.`,
  restart: `// A separate explicit user action, never part of copying or saving.
async function requestRestart() {
  return qdnRequest({ action: 'RESTART_NODE' });
}
// Home asks to restart the selected Core. { accepted: true } acknowledges
// the request, not a completed restart or a healthy/synchronized node.
// Expect temporary disconnection; refresh status/metadata after it returns.`,
} as const;

export function Reference() {
  const [copied, setCopied] = useState('');
  async function copy(key: string, value: string, button: HTMLButtonElement) {
    setCopied(await copyTextToClipboard(value) ? key : 'unavailable');
    button.focus({ preventScroll: true });
  }
  return <article className="reference" aria-label="Node developer reference" lang="en" dir="ltr">
    <header className="reference-header"><h2>Developers</h2>
      <p>Qortium Core inspection and settings through Qortium Home.</p>
      <ReferenceNavigation />
      <p className="copy-status" role="status" aria-live="polite">{copied === 'unavailable' ? 'Clipboard unavailable. Select the code and copy it manually.' : copied ? `Copied ${copied} example.` : 'Code examples can be selected for manual copying.'}</p>
    </header>
    <div className="reference-scroll">
      <section id="reference-contract" tabIndex={-1}><h3>Host and authority</h3>
        <p>Node is a Qortium-only app published as <code>APP/Node/Node</code>. It inspects the active Qortium Core route selected in Home; it is not a Qortal node manager. The public app bundle and this reference contain no live node settings, credentials or wallet data.</p>
        <p>Use <code>SHOW_ACTIONS</code> and <code>IS_USING_PUBLIC_NODE</code> to discover the current host. Node’s write UI requires an update action, a node not reported as public, and writable metadata for each app-allowed field. An unknown public-node flag is not authority: Home independently requires a trusted local or authenticated route and a per-request approval. Switching node or API-key trust while approving invalidates the write.</p>
        <p>Home owns the connection and credentials. Apps must not ask users to paste API keys or private keys, embed them in QDN assets, or use a direct browser request to bypass Home approval. Viewing Developers or copying examples performs no settings mutation or restart.</p>
        <p>The standalone development adapter reads <code>http://127.0.0.1:24891</code> (configurable at build time with <code>VITE_QORTIUM_NODE_API_URL</code>). It permits GET/HEAD and does not advertise update/restart actions. The reference remains available when Core is offline. A developer browser fallback is not an authenticated admin route.</p>
      </section>
      <section id="reference-reads" tabIndex={-1}><h3>Status and peers</h3>
        <p><code>GET_NODE_STATUS</code> returns a direct status object, with optional sync phase/percent, height/target/remaining blocks, minting possibility, connection counts and reachability fields. Missing fields stay unknown. <code>FETCH_NODE_API</code> returns an envelope with <code>ok</code>, HTTP <code>status</code>, <code>contentType</code>, <code>body</code> and parsed <code>data</code>. Node accepts direct objects from older adapters too; independent consumers should check response success and validate data before use.</p>
        <dl>{NODE_READ_PATHS.map(([path, meaning]) => <div key={path}><dt><code>{path}</code></dt><dd>{meaning}</dd></div>)}</dl>
        <p>Chain peers and QDN/data peers are separate connections, with IP/I2P and inbound/outbound breakdowns. Node IDs can overlap between the two networks: a connection count is not a unique-node count. Diagnostic availability, backoff, connectability and an I2P session being up describe different conditions; none alone proves end-to-end QDN transfer. Peer addresses, IDs and settings may identify a device: inspect before sharing a diagnostic export.</p>
        <p>Refresh loads a new snapshot. Optional reads can fail independently and fall back to empty/unknown displays; that is not proof the corresponding node data is empty. Node does not publish these reads to QDN. <code>/admin/settings</code> describes the current loaded settings object. Core reloads this object on save; its values do not prove restart-dependent services have adopted the change. Metadata can report differences between the file and that object.</p>
      </section>
      <section id="reference-settings" tabIndex={-1}><h3>Settings and units</h3>
        <p><code>GET_NODE_SETTINGS_METADATA</code> is preferred; Node also attempts the read-only metadata path when unavailable. <code>normalizeSettingsMetadata</code> supports a plain writable map or JAXB <code>writable.entry</code> records. A top-level writable array is not supported by Node’s current normalizer. Missing or malformed writable metadata leaves fields read-only. Metadata includes per-field <code>type</code>/<code>restartRequired</code>, and may include <code>pendingRestart</code>, <code>fileChanged</code>, <code>fileDiffersFromRuntime</code> and <code>fileComparisonError</code>. Do not depend on a local settings-file path being exposed.</p>
        <p>Current app allowlist ({PHASE_1_EDITABLE_SETTING_KEYS.length} fields, in the existing settings order):</p>
        <ul className="reference-keys">{PHASE_1_EDITABLE_SETTING_KEYS.map(key => <li key={key}><code>{key}</code></li>)}</ul>
        <p>Core adding a writable key does not automatically expose it in Node. Conversely, being in this allowlist does not make a field writable on every node. Keep editor defaults, validation and ordering consistent when intentionally adding a field.</p>
        <dl>
          <dt>Storage / retention</dt><dd><code>maxStorageCapacity</code> displays decimal GB ({STORAGE_CAPACITY_GIGABYTE_BYTES.toLocaleString('en-US')} bytes/GB); <code>chatMessageRetentionPeriod</code> displays hours ({CHAT_RETENTION_HOUR_MS.toLocaleString('en-US')} ms/hour). The current editor accepts at least 1 GB or 1 hour, with up to three decimal places; conversion rounds to safe integer native units. Invalid input does not enter the patch.</dd>
          <dt>Numeric / version fields</dt><dd>Ports are integers from 1 to 65535. Peer limits are positive integers except minOutboundPeers, which permits zero. The minimum version uses three numeric components, each from 0 to 32767. Core remains the final validator.</dd>
          <dt>Enums</dt><dd>Storage: {STORAGE_POLICY_OPTIONS.join(', ')}. Auto update: {AUTO_UPDATE_MODE_OPTIONS.join(', ')}. Transport selections: {TRANSPORT_SELECTION_OPTIONS.map(x => x.label).join(', ')}. Transport order is not a distinct UI choice; legacy reversed arrays normalize to the combined option.</dd>
        </dl>
        <p><code>relayModeEnabled</code> is intentionally absent: Qortium relays QDN whenever QDN is enabled. Retention policy, capacity, public/private data and push-on-publish remain separate controls. The reference does not add new settings permissions.</p>
      </section>
      <section id="reference-writes" tabIndex={-1}><h3>Save and restart</h3>
        <p>Discover {SETTINGS_BRIDGE_ACTIONS.map((action, i) => <span key={action}>{i ? ', ' : ''}<code>{action}</code></span>)} independently. Node sends only changed, valid fields as <code>{'{ action: "UPDATE_NODE_SETTINGS", settings: patch }'}</code>. Home 2 also accepts patch/payload aliases, validates the writable keys before prompting and shows the selected node with current/proposed values. A single request is limited to 64 settings, with key lengths up to 120 characters and bounded display values.</p>
        <p>Approval belongs to Home and each request. The response exposes <code>saved</code> and key lists <code>applied</code>, <code>updated</code>, <code>removed</code>, <code>restartRequired</code>; Home 2 removes filesystem paths from the update result. Save is distinct from applying a restart-required value. Re-read both settings and metadata; file comparisons can fail independently.</p>
        <p>Current Core retains a <code>pendingRestart</code> marker after a saved value is reverted to its original value. Check <code>fileChanged</code> and <code>fileDiffersFromRuntime</code> separately: these compare the file with the loaded settings object, not every service’s effective configuration. Neither a marker nor an empty file comparison alone proves whether a service needs restart. Node builds patches against its last settings snapshot; Refresh explicitly reloads that snapshot and clears the draft. Do not restart automatically.</p>
        <p>There is no <code>expectedRevision</code> contract here. Do not silently retry writes after timeout/disconnection; the change may already have reached Core. Refresh and review the actual state. Denial keeps the draft available. A successful save or explicit Refresh resets Node’s draft; switching tabs and Back/Forward preserves it.</p>
        <p><code>RESTART_NODE</code> is a separate explicit request with its own approval. It acknowledges a restart request, not health or completion. Node displays “restart requested”; subsequent status/metadata reads establish whether the node returned and saved values became effective. Restarting can interrupt node activity; saving does not automatically request it.</p>
        <p>Canonical reference route: <code>qdn://APP/Node/Node?view=developers</code>; developer/reference aliases normalize to developers. <code>?page=settings</code> is preserved while viewing the reference. Returning to Node Status or Core Settings removes reference view/section parameters. Section links retain host parameters, repeated unknown parameters and fragments; Home Back/Forward restores the workspace.</p>
      </section>
      <section id="reference-examples" tabIndex={-1}><h3>Bridge examples</h3><p>Examples illustrate the contract, using no live device data. Copying does not execute them. Keep settings changes and restart calls behind an explicit user decision.</p>
        {Object.entries(REFERENCE_SNIPPETS).map(([key, value]) => <div className="reference-example" key={key}><h4>{key}</h4><button type="button" aria-label={`Copy ${key} example`} onClick={e => void copy(key, value, e.currentTarget)}>Copy</button><pre aria-label={`${key} example`}><code>{value}</code></pre></div>)}
      </section>
    </div>
  </article>;
}
