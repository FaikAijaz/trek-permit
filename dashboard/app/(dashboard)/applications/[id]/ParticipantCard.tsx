'use client';

import { useState } from 'react';
import { decideParticipant, ParticipantDecision } from '@/lib/api/participants';
import { fetchDocumentBlob } from '@/lib/api/documents';
import { ApiError } from '@/lib/api/client';
import { Participant, ParticipantDetail } from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/Button';

// backend/src/participants/participants.service.ts LEGAL_DECISIONS —
// mirrored here only to decide which buttons to show; the backend is the
// real enforcement if this ever drifts.
const LEGAL_DECISIONS: Partial<Record<string, ParticipantDecision[]>> = {
  PENDING: ['APPROVED', 'REJECTED', 'CORRECTION_REQUESTED'],
  CORRECTION_REQUESTED: ['APPROVED', 'REJECTED'],
};

export function ParticipantCard({
  applicationId,
  base,
  detail,
  isLeader,
  canDecide,
  onDecided,
}: {
  applicationId: string;
  base: Participant;
  detail: ParticipantDetail | undefined;
  isLeader: boolean;
  canDecide: boolean;
  onDecided: () => Promise<void>;
}) {
  const [openForm, setOpenForm] = useState<ParticipantDecision | null>(null);
  const [remark, setRemark] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);

  const legalDecisions = LEGAL_DECISIONS[base.status] ?? [];

  async function handleView(documentId: string) {
    setError(null);
    setViewingDocId(documentId);
    try {
      const blob = await fetchDocumentBlob(applicationId, base.id, documentId);
      const url = URL.createObjectURL(blob);
      // The new tab holds its own reference once it's opened; releasing
      // this one a little later (not immediately) avoids revoking it out
      // from under a slow-loading PDF viewer.
      window.open(url, '_blank', 'noopener');
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not open this document');
    } finally {
      setViewingDocId(null);
    }
  }

  async function submit(decision: ParticipantDecision) {
    if (decision !== 'APPROVED' && !remark.trim()) return;
    setError(null);
    setIsBusy(true);
    try {
      await decideParticipant(base.id, decision, remark.trim() || undefined);
      setOpenForm(null);
      setRemark('');
      await onDecided();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium text-gray-900">
            {base.fullName}
            {isLeader && (
              <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-500">
                Leader
              </span>
            )}
          </div>
          <div className="text-sm text-gray-500">ID …{base.identityLast4}</div>
        </div>
        <StatusBadge status={base.status} />
      </div>

      {base.officerRemark && (
        <p className="mt-2 text-sm text-gray-600">
          <span className="font-medium text-gray-500">Officer&apos;s note:</span>{' '}
          {base.officerRemark}
        </p>
      )}

      {detail && detail.priorRejections.length > 0 && (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-900">
          <p className="font-medium">
            Rejected before, under a different application, in the last 12 months:
          </p>
          <ul className="mt-1 list-disc pl-4">
            {detail.priorRejections.map((r) => (
              <li key={r.id}>
                {r.application.reference} ({r.application.trekRoute.name}),{' '}
                {r.reviewedAt.slice(0, 10)}
                {r.officerRemark ? ` — ${r.officerRemark}` : ''}
              </li>
            ))}
          </ul>
          <p className="mt-1 italic">Informational only — doesn&apos;t block this decision.</p>
        </div>
      )}

      <div className="mt-3">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Documents</p>
        {base.documents.filter((d) => d.isCurrent).length === 0 ? (
          <p className="mt-1 text-sm text-gray-400">None uploaded yet.</p>
        ) : (
          <ul className="mt-1 space-y-1 text-sm text-gray-600">
            {base.documents
              .filter((d) => d.isCurrent)
              .map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2">
                  <span>
                    {d.documentType.replace(/_/g, ' ')} &mdash; {d.originalFilename} (v{d.version})
                  </span>
                  <button
                    onClick={() => handleView(d.id)}
                    disabled={viewingDocId === d.id}
                    className="shrink-0 text-xs font-medium text-emerald-700 hover:text-emerald-800 disabled:text-gray-400"
                  >
                    {viewingDocId === d.id ? 'Opening…' : 'View'}
                  </button>
                </li>
              ))}
          </ul>
        )}
      </div>

      {canDecide && legalDecisions.length > 0 && (
        <div className="mt-4 border-t border-gray-100 pt-3">
          <div className="flex flex-wrap gap-2">
            {legalDecisions.includes('APPROVED') && (
              <Button onClick={() => submit('APPROVED')} loading={isBusy}>
                Approve
              </Button>
            )}
            {legalDecisions.includes('CORRECTION_REQUESTED') && (
              <Button
                variant="secondary"
                onClick={() => setOpenForm(openForm === 'CORRECTION_REQUESTED' ? null : 'CORRECTION_REQUESTED')}
                disabled={isBusy}
              >
                Request correction
              </Button>
            )}
            {legalDecisions.includes('REJECTED') && (
              <Button
                variant="danger"
                onClick={() => setOpenForm(openForm === 'REJECTED' ? null : 'REJECTED')}
                disabled={isBusy}
              >
                Reject
              </Button>
            )}
          </div>

          {openForm && (
            <div className="mt-2 space-y-2">
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder={
                  openForm === 'REJECTED'
                    ? 'Why is this person rejected?'
                    : 'What needs to be corrected?'
                }
                rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
              <Button
                variant={openForm === 'REJECTED' ? 'danger' : 'primary'}
                onClick={() => submit(openForm)}
                disabled={!remark.trim()}
                loading={isBusy}
              >
                Confirm
              </Button>
              {isLeader && openForm === 'REJECTED' && (
                <p className="text-xs text-amber-700">
                  Rejecting the trek leader rejects the whole application (BUILD_SPEC.md
                  Section 2, #2).
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
