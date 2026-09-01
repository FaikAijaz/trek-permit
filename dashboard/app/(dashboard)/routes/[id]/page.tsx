'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteRoute, fetchRoute, RouteInput, updateRoute } from '@/lib/api/routes';
import { ApiError } from '@/lib/api/client';
import { RouteForm } from '@/components/RouteForm';
import { Button } from '@/components/Button';

export default function EditRoutePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [route, setRoute] = useState<RouteInput | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchRoute(id)
      .then((r) =>
        setRoute({
          name: r.name,
          region: r.region,
          description: r.description ?? undefined,
          difficulty: r.difficulty ?? undefined,
          isOpen: r.isOpen,
          requiredDocuments: r.requiredDocuments,
          capacityPerDay: r.capacityPerDay ?? undefined,
          minLeadTimeDays: r.minLeadTimeDays,
        }),
      )
      .catch((err) =>
        setLoadError(err instanceof ApiError ? err.message : 'Could not load this route'),
      );
  }, [id]);

  const isValid = !!route && route.name.trim().length > 0 && route.region.trim().length > 0;

  async function handleSave() {
    if (!route || !isValid) return;
    setError(null);
    setIsSaving(true);
    try {
      await updateRoute(id, route);
      router.push('/routes');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    setError(null);
    setIsDeleting(true);
    try {
      await deleteRoute(id);
      router.push('/routes');
    } catch (err) {
      // Most likely a 409 — applications already reference this route
      // (routes.service.ts remove()). Shown inline rather than lost.
      setError(err instanceof ApiError ? err.message : 'Could not delete this route');
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  }

  if (loadError) {
    return <p className="text-sm text-red-700">{loadError}</p>;
  }
  if (!route) {
    return <p className="text-sm text-gray-400">Loading…</p>;
  }

  return (
    <div className="mx-auto max-w-xl">
      <button
        onClick={() => router.push('/routes')}
        className="mb-4 text-sm text-gray-500 hover:text-gray-800"
      >
        &larr; Back to routes
      </button>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h1 className="mb-5 text-lg font-semibold text-gray-900">Edit trek route</h1>
        <RouteForm value={route} onChange={(patch) => setRoute((prev) => ({ ...prev!, ...patch }))} />

        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

        <div className="mt-6 flex gap-3">
          <Button onClick={handleSave} disabled={!isValid} loading={isSaving} className="flex-1">
            Save changes
          </Button>
          <Button
            variant="danger"
            onClick={() => setShowDeleteConfirm((v) => !v)}
            disabled={isSaving || isDeleting}
          >
            Delete
          </Button>
        </div>

        {showDeleteConfirm && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            <p>
              Delete <strong>{route.name}</strong>? This can&apos;t be undone. It will fail if any
              application already references this route.
            </p>
            <div className="mt-3 flex gap-2">
              <Button variant="danger" onClick={handleDelete} loading={isDeleting}>
                Confirm delete
              </Button>
              <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
