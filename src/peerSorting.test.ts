import { describe, expect, it } from 'vitest';
import { getNextPeerSortRules, sortPeerRows, type PeerSortRule } from './peerSorting';
import type { PeerTableRow } from './types';

function peer(overrides: Partial<PeerTableRow>): PeerTableRow {
  return {
    address: 'unknown',
    age: '-',
    direction: 'outbound',
    kind: 'chain',
    lastAccessed: '-',
    lastAccessedTimestamp: null,
    lastHeight: '-',
    lastPing: '-',
    nodeId: '-',
    transport: 'ip',
    version: '-',
    ...overrides,
  };
}

describe('peer sorting', () => {
  it('stacks sorts with the newest column as primary and previous columns as tie-breakers', () => {
    const rows = [
      peer({ address: 'a', transport: 'i2p', version: '1.2.0' }),
      peer({ address: 'b', transport: 'ip', version: '1.3.0' }),
      peer({ address: 'c', transport: 'ip', version: '1.1.0' }),
      peer({ address: 'd', transport: 'i2p', version: '1.0.0' }),
    ];

    const versionRules = getNextPeerSortRules([], 'version');
    const stackedRules = getNextPeerSortRules(versionRules, 'transport');

    expect(sortPeerRows(rows, stackedRules).map((row) => row.address)).toEqual(['c', 'b', 'd', 'a']);
  });

  it('reverses a column when clicked twice', () => {
    const ascendingRules = getNextPeerSortRules([], 'version');
    const descendingRules = getNextPeerSortRules(ascendingRules, 'version');

    expect(ascendingRules).toEqual<PeerSortRule[]>([{ column: 'version', direction: 'asc' }]);
    expect(descendingRules).toEqual<PeerSortRule[]>([{ column: 'version', direction: 'desc' }]);
  });

  it('can apply the same sort rules to refreshed rows', () => {
    const rules = getNextPeerSortRules(getNextPeerSortRules([], 'version'), 'transport');
    const refreshedRows = [
      peer({ address: 'new-i2p-newer', transport: 'i2p', version: '1.5.0' }),
      peer({ address: 'new-ip-newer', transport: 'ip', version: '1.4.0' }),
      peer({ address: 'new-ip-older', transport: 'ip', version: '1.0.0' }),
      peer({ address: 'new-i2p-older', transport: 'i2p', version: '1.2.0' }),
    ];

    expect(sortPeerRows(refreshedRows, rules).map((row) => row.address)).toEqual([
      'new-ip-older',
      'new-ip-newer',
      'new-i2p-older',
      'new-i2p-newer',
    ]);
  });

  it('sorts last accessed by timestamp instead of display text', () => {
    const rows = [
      peer({ address: 'older', lastAccessed: '5m ago', lastAccessedTimestamp: 1000 }),
      peer({ address: 'idle', lastAccessed: 'idle', lastAccessedTimestamp: null }),
      peer({ address: 'newer', lastAccessed: '1m ago', lastAccessedTimestamp: 5000 }),
    ];

    expect(sortPeerRows(rows, getNextPeerSortRules([], 'lastAccessed')).map((row) => row.address)).toEqual([
      'older',
      'newer',
      'idle',
    ]);
  });
});
