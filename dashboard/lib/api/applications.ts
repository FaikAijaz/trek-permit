import { apiRequest } from './client';
import { Application, ApplicationStatus } from '../types';

export interface FindApplicationsFilter {
  status?: ApplicationStatus;
  search?: string;
  trekRouteId?: string;
  from?: string;
  to?: string;
}

/** Staff (officer/admin) gets every application, not just their own — see
 * backend/src/applications/applications.controller.ts findAll(). */
export function fetchApplications(filter: FindApplicationsFilter = {}): Promise<Application[]> {
  const params = new URLSearchParams();
  if (filter.status) params.set('status', filter.status);
  if (filter.search) params.set('search', filter.search);
  if (filter.trekRouteId) params.set('trekRouteId', filter.trekRouteId);
  if (filter.from) params.set('from', filter.from);
  if (filter.to) params.set('to', filter.to);
  const qs = params.toString();
  return apiRequest(`/applications${qs ? `?${qs}` : ''}`);
}

export function fetchApplication(id: string): Promise<Application> {
  return apiRequest(`/applications/${id}`);
}

export function approveApplication(id: string): Promise<Application> {
  return apiRequest(`/applications/${id}/approve`, { method: 'POST' });
}

export function rejectApplication(id: string, reason: string): Promise<Application> {
  return apiRequest(`/applications/${id}/reject`, { method: 'POST', body: { reason } });
}
