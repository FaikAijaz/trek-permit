import { apiRequest } from './client';
import { DocumentType, RouteDifficulty, TrekRoute } from '../types';

// Mirrors backend/src/routes/dto/create-route.dto.ts. update-route.dto.ts
// is just PartialType(CreateRouteDto) on the backend — same shape here,
// all optional.
//
// difficulty/capacityPerDay are `| null`, not just optional — PATCH only
// touches keys actually present in the JSON body (an `undefined` value
// gets dropped by JSON.stringify before it ever leaves the browser, so the
// backend never even sees that key and leaves the column untouched). To
// actually *clear* a previously-set field, the request has to say
// `null` explicitly, not just omit the key.
export interface RouteInput {
  name: string;
  region: string;
  description?: string;
  difficulty?: RouteDifficulty | null;
  isOpen?: boolean;
  requiredDocuments?: DocumentType[];
  capacityPerDay?: number | null;
  minLeadTimeDays?: number;
}

export function fetchRoutes(): Promise<TrekRoute[]> {
  // No ?isOpen filter — the dashboard manages routes, including closed
  // ones, unlike the mobile Trekker app which only ever wants open ones.
  return apiRequest('/routes');
}

export function fetchRoute(id: string): Promise<TrekRoute> {
  return apiRequest(`/routes/${id}`);
}

export function createRoute(input: RouteInput): Promise<TrekRoute> {
  return apiRequest('/routes', { method: 'POST', body: input });
}

export function updateRoute(id: string, patch: Partial<RouteInput>): Promise<TrekRoute> {
  return apiRequest(`/routes/${id}`, { method: 'PATCH', body: patch });
}

// 409s if any application already references this route — see
// backend/src/routes/routes.service.ts remove().
export function deleteRoute(id: string): Promise<void> {
  return apiRequest(`/routes/${id}`, { method: 'DELETE' });
}

// Mirrors backend/src/routes/routes.service.ts's VisitorListItem.
export interface VisitorListItem {
  participantId: string;
  fullName: string;
  identityLast4: string;
  isLeader: boolean;
  isGuide: boolean;
  mobile: string | null;
  applicationReference: string;
  permitStatus: 'active' | 'revoked' | null;
}

/** `date` as YYYY-MM-DD. */
export function fetchVisitors(routeId: string, date: string): Promise<VisitorListItem[]> {
  return apiRequest(`/routes/${routeId}/visitors?date=${date}`);
}
