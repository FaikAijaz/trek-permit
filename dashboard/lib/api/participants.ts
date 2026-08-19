import { apiRequest } from './client';
import { ParticipantDetail } from '../types';

export type ParticipantDecision = 'APPROVED' | 'REJECTED' | 'CORRECTION_REQUESTED';

export function fetchParticipant(id: string): Promise<ParticipantDetail> {
  return apiRequest(`/participants/${id}`);
}

export function decideParticipant(
  id: string,
  decision: ParticipantDecision,
  remark?: string,
): Promise<ParticipantDetail> {
  return apiRequest(`/participants/${id}/decision`, {
    method: 'PATCH',
    body: { decision, remark },
  });
}
