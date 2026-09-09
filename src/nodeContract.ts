/** Existing Node/Home contract shared by the UI and public reference. */
export const SETTINGS_BRIDGE_ACTIONS = ['GET_NODE_SETTINGS_METADATA', 'UPDATE_NODE_SETTINGS', 'RESTART_NODE'] as const;
export const NODE_READ_PATHS = [
  ['/admin/info', 'Core build, uptime and node identity'],
  ['/admin/settings', 'Effective Core settings'],
  ['/admin/settings/metadata', 'Writable settings and restart/file differences'],
  ['/peers', 'Connected chain peers'],
  ['/peers/data', 'Connected QDN/data peers'],
  ['/peers/known/diagnostics', 'Known chain-peer diagnostics'],
  ['/peers/data/known/diagnostics', 'Known data-peer diagnostics'],
] as const;
