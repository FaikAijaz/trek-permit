import { apiRequest } from './client';
import { Permit } from './types';

export function fetchPermit(id: string): Promise<Permit> {
  return apiRequest(`/permits/${id}`);
}
