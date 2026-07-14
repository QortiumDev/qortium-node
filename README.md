# Qortium Node

A QDN app for inspecting and managing the active Qortium Core node.

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

Editable settings:

- Keep `PHASE_1_EDITABLE_SETTING_KEYS` in the same logical order as
  `SETTING_ORDER` in `src/settingsView.ts`. The editable section is a pulled-out
  view of the original full settings order, not an appended allowlist.
- `minDataPeers` is editable when the active Core reports it as writable.
