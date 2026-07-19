# Qortium Node

A QDN app for inspecting and managing the active Qortium Core node.

Settings edits and node restarts require running inside Qortium Home, which
provides the write bridge actions; in a plain browser the app feature-detects
the missing `window.qdnRequest` bridge and stays read-only.

Default QDN identity:

- `APP/Node/Node`

Current scope:

- Read node status through `GET_NODE_STATUS`.
- Read Core metadata and peer lists through read-only `FETCH_NODE_API` calls.
- Show chain vs QDN/data peers, IP vs I2P, inbound vs outbound breakdowns,
  and chain/data peer diagnostics when Core exposes them.
- Edit the bounded Core settings exposed by Home bridge actions:
  - `GET_NODE_SETTINGS_METADATA`
  - `UPDATE_NODE_SETTINGS`
  - `RESTART_NODE`
- Preserve the original Core settings order when rendering editable settings.
- Present `maxStorageCapacity` in gigabytes and
  `chatMessageRetentionPeriod` in hours while sending Core its native units.
- Keep local browser development read-only against `http://127.0.0.1:24891`.
- Route visible UI copy through `src/i18n.ts` with English fallback strings.
- Detect language from Home/query display settings first, then Core `localeLang`
  from `/admin/settings`, then English.

Planned later scope:

- Add translated catalogs by reusing existing Core/Home/Qortium app wording where practical.

Development:

```bash
npm install
npm run build
npm test
npm run dev
```

Versioning:

- Node follows the Qortium app versioning standard (QAVS): the current app
  version is 1.4.2, where the `1.4` prefix declares the minimum Qortium
  platform level the app is built against and the last number is the app's
  own release counter.
- The build emits a `qortium-app.json` manifest (see `vite.config.ts`) that
  Qortium Home reads from the published root.

Publishing:

```bash
npm run build
npm run qdn:publish
```

- By default the publish helper uploads `dist/` as `qdn://APP/Node/Node`
  through `http://127.0.0.1:24891`, using the local preview account files
  under `~/qortium/git/qortium-core/preview/`.
- The helper uses `QORTIUM_NODE_NODE_API_KEY` or
  `QORTIUM_NODE_NODE_API_KEY_PATH` when set, then tries the API key for the
  active local Core process, and finally falls back to
  `~/.config/qortium-core/runtime/apikey.txt`.
- Set `QORTIUM_NODE_NODE_API_URL`, `QORTIUM_NODE_QDN_NAME`,
  `QORTIUM_NODE_QDN_IDENTIFIER`, `QORTIUM_NODE_QDN_TITLE`,
  `QORTIUM_NODE_QDN_SERVICE`, `QORTIUM_NODE_DIST_PATH`, or
  `QORTIUM_NODE_PREVIEW_ACCOUNTS_PATH` to publish another QDN resource or use
  another node.

Editable settings:

- Keep `PHASE_1_EDITABLE_SETTING_KEYS` in the same logical order as
  `SETTING_ORDER` in `src/settingsView.ts`. The editable section is a pulled-out
  view of the original full settings order, not an appended allowlist.
- `minDataPeers` is editable when the active Core reports it as writable.
