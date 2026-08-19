import { apiRequest } from './client';
import { Permit } from '../types';

/** BUILD_SPEC.md Section 2, #5 — the officer's explicit "are you sure"
 * step. Retried with confirmExclusions: true after a 409 lists who'd be
 * excluded (see the dashboard's applications/[id] page for that flow). */
export function issuePermit(
  applicationId: string,
  confirmExclusions?: boolean,
): Promise<Permit> {
  return apiRequest(`/applications/${applicationId}/permit`, {
    method: 'POST',
    body: { confirmExclusions },
  });
}

export function fetchPermit(id: string): Promise<Permit> {
  return apiRequest(`/permits/${id}`);
}

/** Admin-only at the backend (RolesGuard) — the button calling this is
 * hidden for an officer, but the backend is the real enforcement. */
export function revokePermit(id: string, reason: string): Promise<void> {
  return apiRequest(`/permits/${id}/revoke`, { method: 'POST', body: { reason } });
}
