import { describe, expect, it } from 'vitest';
import {
  buildPeerBreakdown,
  buildPeerRows,
  getPeerDiagnosticReasonEntries,
  normalizeDirection,
  normalizePeerDiagnostics,
  normalizeTransport,
} from './nodeData';
import type { ConnectedPeer } from './types';

describe('node peer data transforms', () => {
  const labels = {
    empty: '-',
    idle: 'idle',
    timeAgo: (age: string) => `${age} ago`,
    unknown: 'unknown',
  };

  const chainPeers: ConnectedPeer[] = [
    {
      address: '1.2.3.4:24892',
      direction: 'OUTBOUND',
      lastHeight: 123,
      nodeId: 'node-a',
      transport: 'IP',
      version: 'qortium-test',
    },
    {
      address: 'abc.b32.i2p',
      direction: 'INBOUND',
      nodeId: 'node-b',
      version: 'qortium-test',
    },
  ];

  const dataPeers: ConnectedPeer[] = [
    {
      address: 'abc.b32.i2p',
      direction: 'OUTBOUND',
      lastAccessed: 1_700_000_000_000,
      nodeId: 'node-b',
      transport: 'I2P',
    },
  ];

  it('classifies peer transport and direction', () => {
    expect(normalizeTransport(chainPeers[0])).toBe('ip');
    expect(normalizeTransport(chainPeers[1])).toBe('i2p');
    expect(normalizeDirection(chainPeers[0])).toBe('outbound');
    expect(normalizeDirection(chainPeers[1])).toBe('inbound');
  });

  it('builds chain vs data peer breakdowns', () => {
    const breakdown = buildPeerBreakdown(chainPeers, dataPeers);

    expect(breakdown.total).toBe(3);
    expect(breakdown.chain.total).toBe(2);
    expect(breakdown.chain.ip).toBe(1);
    expect(breakdown.chain.i2p).toBe(1);
    expect(breakdown.chain.inbound).toBe(1);
    expect(breakdown.chain.outbound).toBe(1);
    expect(breakdown.data.total).toBe(1);
    expect(breakdown.data.i2p).toBe(1);
    expect(breakdown.distinctNodeIds).toBe(2);
    expect(breakdown.duplicatedNodeIds).toBe(1);
  });

  it('formats rows for display', () => {
    const rows = buildPeerRows('chain', chainPeers, labels);

    expect(rows[0]).toMatchObject({
      address: '1.2.3.4:24892',
      direction: 'outbound',
      kind: 'chain',
      lastHeight: '123',
      lastAccessed: '-',
      lastAccessedTimestamp: null,
      nodeId: 'node-a',
      transport: 'ip',
      version: 'qortium-test',
    });
  });

  it('formats QDN data peer activity instead of chain-only height and ping fields', () => {
    const rows = buildPeerRows('data', dataPeers, labels, 1_700_000_120_000);

    expect(rows[0]).toMatchObject({
      kind: 'data',
      lastAccessed: '2m ago',
      lastAccessedTimestamp: 1_700_000_000_000,
      lastHeight: '-',
      lastPing: '-',
    });
  });

  it('shows idle when QDN data peers have not been accessed', () => {
    const rows = buildPeerRows('data', [{ address: 'idle.b32.i2p', transport: 'I2P' }], labels);

    expect(rows[0].lastAccessed).toBe('idle');
    expect(rows[0].lastAccessedTimestamp).toBeNull();
  });

  it('normalizes peer diagnostics from Core JSON', () => {
    const diagnostics = normalizePeerDiagnostics({
      allowedTransports: ['I2P'],
      backoffCount: 2,
      connectableCount: 0,
      connectedCount: 0,
      handshakedCount: 0,
      i2pSessionUp: false,
      knownCount: 3,
      layer: 'DATA',
      outboundHandshakedCount: 0,
      peers: [
        {
          address: 'peer.b32.i2p',
          connectable: false,
          failedSyncCount: 1,
          inBackoff: true,
          reasons: ['RECENT_CONNECT_FAILURE', 'I2P_SESSION_DOWN'],
          tags: ['INITIAL_DATA_PEER'],
          transport: 'I2P',
        },
      ],
      qdnFallbackCandidateCount: 1,
      reasonCounts: {
        I2P_SESSION_DOWN: 1,
        RECENT_CONNECT_FAILURE: 2,
      },
    });

    expect(diagnostics).toMatchObject({
      allowedTransports: ['I2P'],
      backoffCount: 2,
      connectableCount: 0,
      i2pSessionUp: false,
      knownCount: 3,
      layer: 'DATA',
      qdnFallbackCandidateCount: 1,
      reasonCounts: {
        I2P_SESSION_DOWN: 1,
        RECENT_CONNECT_FAILURE: 2,
      },
    });
    expect(diagnostics?.peers[0]).toMatchObject({
      address: 'peer.b32.i2p',
      failedSyncCount: 1,
      inBackoff: true,
      reasons: ['RECENT_CONNECT_FAILURE', 'I2P_SESSION_DOWN'],
      tags: ['INITIAL_DATA_PEER'],
    });
  });

  it('normalizes JAXB-style peer diagnostics reason maps and sorts reason counts', () => {
    const diagnostics = normalizePeerDiagnostics({
      knownCount: 2,
      peers: [],
      reasonCounts: {
        entry: [
          { key: 'I2P_SESSION_DOWN', value: 1 },
          { key: 'RECENT_CONNECT_FAILURE', value: 3 },
          { key: 'ALREADY_CONNECTED', value: 3 },
        ],
      },
    });

    expect(diagnostics?.reasonCounts).toEqual({
      ALREADY_CONNECTED: 3,
      I2P_SESSION_DOWN: 1,
      RECENT_CONNECT_FAILURE: 3,
    });
    expect(getPeerDiagnosticReasonEntries(diagnostics)).toEqual([
      ['ALREADY_CONNECTED', 3],
      ['RECENT_CONNECT_FAILURE', 3],
      ['I2P_SESSION_DOWN', 1],
    ]);
  });

  it('ignores invalid peer diagnostics payloads', () => {
    expect(normalizePeerDiagnostics(null)).toBeNull();
    expect(normalizePeerDiagnostics([])).toBeNull();
  });
});
