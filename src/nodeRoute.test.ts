import { describe, expect, it } from 'vitest';
import { getNodeRouteUrl, readNodeRoute } from './nodeRoute';

describe('Node routes', () => {
  it('reads a valid page value', () => {
    expect(readNodeRoute('https://example.test/app?page=settings')).toEqual({ page: 'settings' });
    expect(readNodeRoute('https://example.test/app?page=overview')).toEqual({ page: 'overview' });
  });

  it('falls back to overview for invalid or missing page values', () => {
    expect(readNodeRoute('https://example.test/app')).toEqual({ page: 'overview' });
    expect(readNodeRoute('https://example.test/app?page=unknown')).toEqual({ page: 'overview' });
    expect(readNodeRoute('https://example.test/app?page=')).toEqual({ page: 'overview' });
  });

  it('replaces only the Node-owned key while preserving host/display settings, unknown params, and fragments', () => {
    const url = getNodeRouteUrl(
      'https://example.test/render/APP/Node/Node?page=settings&qdnHomeBridge=1&theme=dark&lang=en&textSize=large&accent=blue&uiStyle=modern&future=value#detail',
      { page: 'overview' },
    );

    expect(url.pathname).toBe('/render/APP/Node/Node');
    expect(url.searchParams.has('page')).toBe(false);
    expect(url.searchParams.get('qdnHomeBridge')).toBe('1');
    expect(url.searchParams.get('theme')).toBe('dark');
    expect(url.searchParams.get('lang')).toBe('en');
    expect(url.searchParams.get('textSize')).toBe('large');
    expect(url.searchParams.get('accent')).toBe('blue');
    expect(url.searchParams.get('uiStyle')).toBe('modern');
    expect(url.searchParams.get('future')).toBe('value');
    expect(url.hash).toBe('#detail');
  });

  it('omits the default page from the produced URL', () => {
    const url = getNodeRouteUrl('https://example.test/app?page=settings', { page: 'overview' });

    expect(url.searchParams.has('page')).toBe(false);
    expect(url.href).toBe('https://example.test/app');
  });

  it('writes the page param for a non-default route', () => {
    const url = getNodeRouteUrl('https://example.test/app', { page: 'settings' });

    expect(url.searchParams.get('page')).toBe('settings');
  });

  it('round-trips every supported page value', () => {
    for (const route of [{ page: 'overview' as const }, { page: 'settings' as const }]) {
      expect(readNodeRoute(getNodeRouteUrl('https://example.test/app?theme=dark', route))).toEqual(route);
    }
  });
});
