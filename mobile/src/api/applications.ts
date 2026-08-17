import { apiRequest } from './client';
import { Application } from './types';

// Mirrors backend/src/applications/dto/participant.dto.ts — the leader's
// personal details. Group member management isn't part of this pass (see
// the Week 6 scope note in the mobile README).
export interface LeaderInput {
  fullName: string;
  identityNumber: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  mobile?: string;
  emergencyContactName?: string;
  emergencyContactMobile?: string;
  medicalDeclaration?: boolean;
}

export interface CreateApplicationInput {
  trekRouteId: string;
  startDate: string;
  endDate: string;
  leader: LeaderInput;
}

export function fetchApplications(): Promise<Application[]> {
  return apiRequest('/applications');
}

export function fetchApplication(id: string): Promise<Application> {
  return apiRequest(`/applications/${id}`);
}

// Individual only — always sends type: 'individual', matching this pass's
// scope (see backend/src/applications/dto/create-application.dto.ts for
// the group/commercial fields this deliberately omits).
export function createApplication(input: CreateApplicationInput): Promise<Application> {
  return apiRequest('/applications', {
    method: 'POST',
    body: { ...input, type: 'individual' },
  });
}

export function updateLeader(
  applicationId: string,
  participantId: string,
  patch: Partial<LeaderInput>,
): Promise<Application['participants'][number]> {
  return apiRequest(`/applications/${applicationId}/participants/${participantId}`, {
    method: 'PATCH',
    body: patch,
  });
}

export function submitApplication(id: string): Promise<Application> {
  return apiRequest(`/applications/${id}/submit`, { method: 'POST' });
}
