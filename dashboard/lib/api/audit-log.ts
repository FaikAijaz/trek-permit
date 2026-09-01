import { apiRequest } from './client';
import { Application, AuditLogEntry } from '../types';

export interface AuditLogFilter {
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  from?: string;
  to?: string;
}

// Mirrors backend/src/audit/audit.controller.ts: omitting both
// entityType and entityId is the "browse everything" query, which 403s
// for a non-admin. Callers scoping to one entity should always pass both.
export function fetchAuditLog(filter: AuditLogFilter = {}): Promise<AuditLogEntry[]> {
  const params = new URLSearchParams();
  if (filter.entityType) params.set('entityType', filter.entityType);
  if (filter.entityId) params.set('entityId', filter.entityId);
  if (filter.actorUserId) params.set('actorUserId', filter.actorUserId);
  if (filter.from) params.set('from', filter.from);
  if (filter.to) params.set('to', filter.to);
  const qs = params.toString();
  return apiRequest(`/audit-log${qs ? `?${qs}` : ''}`);
}

/** The "Activity" section on an application's detail page. AuditLog rows
 * are per-entity (an application's own create/submit/approve/reject
 * actions live under entityType 'application', but each participant's
 * add/update/remove/exclude and the permit's issue/revoke are logged
 * under their own entityType+entityId) — so this fans out one scoped
 * request per entity the page already knows about and merges the results,
 * rather than trying to express "everything about this application" as a
 * single backend query. Fine at pilot scale (a handful of participants
 * per application, called once on page load). */
export async function fetchApplicationActivity(
  application: Pick<Application, 'id' | 'participants' | 'permits'>,
): Promise<AuditLogEntry[]> {
  const scopes: { entityType: string; entityId: string }[] = [
    { entityType: 'application', entityId: application.id },
    ...application.participants.map((p) => ({ entityType: 'participant', entityId: p.id })),
    ...(application.permits?.map((permit) => ({ entityType: 'permit', entityId: permit.id })) ?? []),
  ];

  const results = await Promise.all(scopes.map((scope) => fetchAuditLog(scope)));
  return results
    .flat()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
