'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  approveApplication,
  fetchApplication,
  rejectApplication,
} from '@/lib/api/applications';
import { fetchParticipant } from '@/lib/api/participants';
import { fetchRoute } from '@/lib/api/routes';
import { issuePermit, revokePermit } from '@/lib/api/permits';
import { ApiError } from '@/lib/api/client';
import { useAuth } from '@/lib/auth-context';
import {
  Application,
  ParticipantDetail,
  TrekRoute,
  UnresolvedParticipant,
} from '@/lib/types';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/Button';
import { QrCode } from '@/components/QrCode';
import { ParticipantCard } from './ParticipantCard';

const REVIEW_STATUSES = ['submitted', 'under_review'];

export default function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const [application, setApplication] = useState<Application | null>(null);
  const [route, setRoute] = useState<TrekRoute | null>(null);
  const [participantDetails, setParticipantDetails] = useState<
    Record<string, ParticipantDetail>
  >({});
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [unresolved, setUnresolved] = useState<UnresolvedParticipant[] | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [showRevokeForm, setShowRevokeForm] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const app = await fetchApplication(id);
      setApplication(app);
      // The application response doesn't carry its route's name/region
      // (applications.service.ts findOneForUser doesn't include trekRoute)
      // — fetched separately, same pattern the mobile app already uses.
      const [routeResult, ...participantResults] = await Promise.all([
        fetchRoute(app.trekRouteId),
        ...app.participants.map((p) => fetchParticipant(p.id)),
      ]);
      setRoute(routeResult);
      setParticipantDetails(
        Object.fromEntries(participantResults.map((p) => [p.id, p])),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load this application');
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function refreshAfterAction() {
    await load();
  }

  async function handleApprove() {
    setActionError(null);
    setIsBusy(true);
    try {
      await approveApplication(id);
      await refreshAfterAction();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) return;
    setActionError(null);
    setIsBusy(true);
    try {
      await rejectApplication(id, rejectReason.trim());
      setShowRejectForm(false);
      setRejectReason('');
      await refreshAfterAction();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleIssuePermit(confirmExclusions?: boolean) {
    setActionError(null);
    setUnresolved(null);
    setIsBusy(true);
    try {
      await issuePermit(id, confirmExclusions);
      await refreshAfterAction();
    } catch (err) {
      if (err instanceof ApiError && err.unresolved) {
        // BUILD_SPEC.md Section 2, #5 — warn first, only exclude on
        // explicit confirmation. This 409 is that warning.
        setUnresolved(err.unresolved);
      } else {
        setActionError(err instanceof ApiError ? err.message : 'Something went wrong');
      }
    } finally {
      setIsBusy(false);
    }
  }

  async function handleRevoke() {
    if (!revokeReason.trim() || !permit) return;
    setActionError(null);
    setIsBusy(true);
    try {
      await revokePermit(permit.id, revokeReason.trim());
      setShowRevokeForm(false);
      setRevokeReason('');
      await refreshAfterAction();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setIsBusy(false);
    }
  }

  if (error) {
    return <p className="text-sm text-red-700">{error}</p>;
  }
  if (!application) {
    return <p className="text-sm text-gray-400">Loading…</p>;
  }

  const leader = application.participants.find((p) => p.isLeader);
  const permit = application.permits?.[0];
  const canReview = REVIEW_STATUSES.includes(application.status);
  const leaderApproved = application.participants.some(
    (p) => p.isLeader && p.status === 'APPROVED',
  );
  const anyApproved = application.participants.some((p) => p.status === 'APPROVED');
  const canApprove = canReview && leaderApproved && anyApproved;
  const canIssue = application.status === 'approved' && !permit;
  const isAdmin = user?.role === 'admin';

  return (
    <div className="space-y-6">
      <button
        onClick={() => router.push('/applications')}
        className="text-sm text-gray-500 hover:text-gray-800"
      >
        &larr; Back to applications
      </button>

      <div className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">{application.reference}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {route ? `${route.name} · ${route.region}` : '…'} &middot; {application.type}
              {application.groupType ? ` (${application.groupType})` : ''}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {application.startDate.slice(0, 10)} &rarr; {application.endDate.slice(0, 10)}
            </p>
            {application.operatorName && (
              <p className="mt-1 text-sm text-gray-500">
                Operator: {application.operatorName} ({application.operatorRegistrationNo})
              </p>
            )}
          </div>
          <StatusBadge status={application.status} />
        </div>

        {application.rejectionReason && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <span className="font-medium">Rejected:</span> {application.rejectionReason}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Participants
        </h2>
        {application.participants.map((p) => (
          <ParticipantCard
            key={p.id}
            base={p}
            detail={participantDetails[p.id]}
            isLeader={p.isLeader}
            canDecide={canReview}
            onDecided={refreshAfterAction}
          />
        ))}
      </div>

      {actionError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {actionError}
        </div>
      )}

      {canReview && (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Application decision
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Requires the trek leader and at least one participant to be APPROVED first.
          </p>
          <div className="mt-3 flex gap-2">
            <Button onClick={handleApprove} disabled={!canApprove} loading={isBusy}>
              Approve application
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowRejectForm((v) => !v)}
              disabled={isBusy}
            >
              Reject application
            </Button>
          </div>
          {showRejectForm && (
            <div className="mt-3 space-y-2">
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason (route closed, dates unavailable, invalid operator registration…)"
                rows={3}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
              <Button
                variant="danger"
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                loading={isBusy}
              >
                Confirm rejection
              </Button>
            </div>
          )}
        </div>
      )}

      {(canIssue || permit) && (
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Permit</h2>

          {canIssue && !unresolved && (
            <div className="mt-3">
              <Button onClick={() => handleIssuePermit()} loading={isBusy}>
                Issue permit
              </Button>
            </div>
          )}

          {unresolved && unresolved.length > 0 && (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <p className="font-medium">
                {unresolved.length} participant{unresolved.length > 1 ? 's are' : ' is'} still
                unresolved:
              </p>
              <ul className="mt-1 list-disc pl-5">
                {unresolved.map((p) => (
                  <li key={p.id}>
                    {p.fullName} &mdash; {p.status.toLowerCase()}
                  </li>
                ))}
              </ul>
              <p className="mt-2">
                Issuing now will mark them <span className="font-medium">EXCLUDED</span> from
                the permit.
              </p>
              <div className="mt-3 flex gap-2">
                <Button onClick={() => handleIssuePermit(true)} loading={isBusy}>
                  Issue anyway
                </Button>
                <Button variant="secondary" onClick={() => setUnresolved(null)} disabled={isBusy}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {permit && (
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
              <QrCode value={permit.qrPayload} size={180} />
              <div className="flex-1 space-y-1 text-sm">
                <div className="font-medium text-gray-900">{permit.reference}</div>
                <div className="text-gray-500">
                  Valid {permit.validFrom.slice(0, 10)} &rarr; {permit.validUntil.slice(0, 10)}
                </div>
                <StatusBadge status={permit.status} />

                {isAdmin && permit.status === 'active' && (
                  <div className="pt-3">
                    <Button
                      variant="danger"
                      onClick={() => setShowRevokeForm((v) => !v)}
                      disabled={isBusy}
                    >
                      Revoke permit
                    </Button>
                    {showRevokeForm && (
                      <div className="mt-2 space-y-2">
                        <textarea
                          value={revokeReason}
                          onChange={(e) => setRevokeReason(e.target.value)}
                          placeholder="Reason for revocation"
                          rows={2}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
                        />
                        <Button
                          variant="danger"
                          onClick={handleRevoke}
                          disabled={!revokeReason.trim()}
                          loading={isBusy}
                        >
                          Confirm revocation
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                {!isAdmin && permit.status === 'active' && (
                  <p className="pt-2 text-xs text-gray-400">
                    Revoking a permit is admin-only.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {!leader && <p className="text-sm text-red-700">No trek leader found on this application.</p>}
    </div>
  );
}
