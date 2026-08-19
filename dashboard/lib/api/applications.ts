import { apiRequest } from './client';
import { Application, ApplicationStatus } from '../types';

/** Staff (officer/admin) gets every application, not just their own — see
 * backend/src/applications/applications.controller.ts findAll(). */
export function fetchApplications(status?: ApplicationStatus): Promise<Application[]> {
  const query = status ? `?status=${status}` : '';
  return apiRequest(`/applications${query}`);
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
