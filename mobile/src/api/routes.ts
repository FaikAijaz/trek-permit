import { apiRequest } from './client';
import { TrekRoute } from './types';

export function fetchOpenRoutes(): Promise<TrekRoute[]> {
  return apiRequest('/routes?isOpen=true');
}

export function fetchRoute(id: string): Promise<TrekRoute> {
  return apiRequest(`/routes/${id}`);
}
