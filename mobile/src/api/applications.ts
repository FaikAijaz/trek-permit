import { apiRequest } from './client';
import { Application, ApplicationStatus, GroupType, Participant } from './types';

// Mirrors backend/src/applications/dto/participant.dto.ts — the shared
// shape for both the trek leader and a group member (BUILD_SPEC.md
// Section 4: one table, one DTO, for the same reason).
export interface ParticipantInput {
  fullName: string;
  identityNumber: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  mobile?: string;
  emergencyContactName?: string;
  emergencyContactMobile?: string;
  medicalDeclaration?: boolean;
  isGuide?: boolean;
  guideRegistrationNo?: string;
}

interface CreateIndividualInput {
  type: 'individual';
  trekRouteId: string;
  startDate: string;
  endDate: string;
  leader: ParticipantInput;
}

interface CreateGroupInput {
  type: 'group';
  groupType: GroupType;
  trekRouteId: string;
  startDate: string;
  endDate: string;
  leader: ParticipantInput;
  // Commercial-only — backend/src/applications/dto/create-application.dto.ts
  // requires all three together, only when groupType is 'commercial'.
  operatorName?: string;
  operatorRegistrationNo?: string;
  operatorRegValidUntil?: string;
}

export type CreateApplicationInput = CreateIndividualInput | CreateGroupInput;

export function fetchApplications(status?: ApplicationStatus): Promise<Application[]> {
  const query = status ? `?status=${status}` : '';
  return apiRequest(`/applications${query}`);
}

export function fetchApplication(id: string): Promise<Application> {
  return apiRequest(`/applications/${id}`);
}

export function createApplication(input: CreateApplicationInput): Promise<Application> {
  return apiRequest('/applications', { method: 'POST', body: input });
}

// Group applications only — an individual application's sole participant
// is created inline by createApplication(); the leader can't be added
// this way (backend rejects it, and there's nothing to add one to before
// the application itself exists).
export function addMember(
  applicationId: string,
  member: ParticipantInput,
): Promise<Participant> {
  return apiRequest(`/applications/${applicationId}/participants`, {
    method: 'POST',
    body: member,
  });
}

export function updateParticipant(
  applicationId: string,
  participantId: string,
  patch: Partial<ParticipantInput>,
): Promise<Participant> {
  return apiRequest(`/applications/${applicationId}/participants/${participantId}`, {
    method: 'PATCH',
    body: patch,
  });
}

// The leader can't be removed this way (backend refuses it) — only ever
// call this for a non-leader member, and only while the application is
// still a draft.
export function removeMember(applicationId: string, participantId: string): Promise<void> {
  return apiRequest(`/applications/${applicationId}/participants/${participantId}`, {
    method: 'DELETE',
  });
}

export function submitApplication(id: string): Promise<Application> {
  return apiRequest(`/applications/${id}/submit`, { method: 'POST' });
}
