import { apiRequest } from './client';
import { TrekRoute } from '../types';

export function fetchRoute(id: string): Promise<TrekRoute> {
  return apiRequest(`/routes/${id}`);
}
