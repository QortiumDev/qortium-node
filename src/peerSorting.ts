import type { PeerDirection, PeerKind, PeerTableRow, PeerTransport } from './types';

export type PeerSortColumn =
  | 'address'
  | 'age'
  | 'direction'
  | 'kind'
  | 'lastAccessed'
  | 'lastHeight'
  | 'lastPing'
  | 'nodeId'
  | 'transport'
  | 'version';

export type PeerSortDirection = 'asc' | 'desc';

export type PeerSortRule = {
  column: PeerSortColumn;
  direction: PeerSortDirection;
};

const kindOrder: Record<PeerKind, number> = {
  chain: 0,
  data: 1,
};

const transportOrder: Record<PeerTransport, number> = {
  ip: 0,
  i2p: 1,
  unknown: 2,
};

const directionOrder: Record<PeerDirection, number> = {
  inbound: 0,
  outbound: 1,
  unknown: 2,
};

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

export function getNextPeerSortRules(rules: PeerSortRule[], column: PeerSortColumn): PeerSortRule[] {
  const existingRule = rules.find((rule) => rule.column === column);
  const direction = existingRule?.direction === 'asc' ? 'desc' : 'asc';

  return [{ column, direction }, ...rules.filter((rule) => rule.column !== column)];
}

export function sortPeerRows(rows: PeerTableRow[], rules: PeerSortRule[]): PeerTableRow[] {
  if (!rules.length) {
    return rows;
  }

  return rows
    .map((row, index) => ({ index, row }))
    .sort((left, right) => {
      for (const rule of rules) {
        const comparison = comparePeerRows(left.row, right.row, rule);

        if (comparison !== 0) {
          return comparison;
        }
      }

      return left.index - right.index;
    })
    .map(({ row }) => row);
}

function comparePeerRows(left: PeerTableRow, right: PeerTableRow, rule: PeerSortRule) {
  const directionMultiplier = rule.direction === 'asc' ? 1 : -1;
  const comparison = comparePeerRowValue(left, right, rule.column);

  return comparison * directionMultiplier;
}

function comparePeerRowValue(left: PeerTableRow, right: PeerTableRow, column: PeerSortColumn) {
  if (column === 'kind') {
    return kindOrder[left.kind] - kindOrder[right.kind];
  }

  if (column === 'transport') {
    return transportOrder[left.transport] - transportOrder[right.transport];
  }

  if (column === 'direction') {
    return directionOrder[left.direction] - directionOrder[right.direction];
  }

  if (column === 'lastHeight' || column === 'lastPing') {
    return compareMaybeNumber(left[column], right[column]);
  }

  if (column === 'lastAccessed') {
    return compareMaybeTimestamp(left.lastAccessedTimestamp, right.lastAccessedTimestamp);
  }

  return collator.compare(left[column], right[column]);
}

function compareMaybeTimestamp(left: number | null, right: number | null) {
  if (left !== null && right !== null) {
    return left - right;
  }

  if (left !== null) {
    return -1;
  }

  if (right !== null) {
    return 1;
  }

  return 0;
}

function compareMaybeNumber(left: string, right: string) {
  const leftNumber = getSortableNumber(left);
  const rightNumber = getSortableNumber(right);

  if (leftNumber !== null && rightNumber !== null) {
    return leftNumber - rightNumber;
  }

  if (leftNumber !== null) {
    return -1;
  }

  if (rightNumber !== null) {
    return 1;
  }

  return collator.compare(left, right);
}

function getSortableNumber(value: string) {
  const normalized = value.replaceAll(',', '').trim();

  if (!normalized) {
    return null;
  }

  const number = Number(normalized);

  return Number.isFinite(number) ? number : null;
}
