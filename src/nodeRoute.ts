import type { AppPage } from './types';

export interface NodeRoute {
  page: AppPage;
}

const NODE_ROUTE_KEYS = ['page'] as const;
const DEFAULT_PAGE: AppPage = 'overview';

export function readNodeRoute(input: string | URL): NodeRoute {
  const url = input instanceof URL ? input : new URL(input, 'http://localhost');
  const requestedPage = url.searchParams.get('page');
  const page: AppPage = requestedPage === 'settings' ? 'settings' : DEFAULT_PAGE;

  return { page };
}

export function getNodeRouteUrl(input: string | URL, route: NodeRoute): URL {
  const url = input instanceof URL ? new URL(input.href) : new URL(input, 'http://localhost');

  for (const key of NODE_ROUTE_KEYS) {
    url.searchParams.delete(key);
  }

  if (route.page !== DEFAULT_PAGE) {
    url.searchParams.set('page', route.page);
  }

  return url;
}
