'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createRoute, RouteInput } from '@/lib/api/routes';
import { ApiError } from '@/lib/api/client';
import { RouteForm } from '@/components/RouteForm';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';

const EMPTY_ROUTE: RouteInput = {
  name: '',
  region: '',
  isOpen: false,
  requiredDocuments: [],
  minLeadTimeDays: 3,
};

export default function NewRoutePage() {
  const router = useRouter();
  const [route, setRoute] = useState<RouteInput>(EMPTY_ROUTE);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isValid = route.name.trim().length > 0 && route.region.trim().length > 0;

  async function handleSubmit() {
    if (!isValid) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const created = await createRoute(route);
      router.replace(`/routes/${created.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <button
        onClick={() => router.push('/routes')}
        className="mb-4 text-sm text-gray-500 hover:text-gray-800"
      >
        &larr; Back to routes
      </button>

      <Card className="p-6">
        <h1 className="mb-5 text-lg font-semibold text-gray-900">New trek route</h1>
        <RouteForm value={route} onChange={(patch) => setRoute((prev) => ({ ...prev, ...patch }))} />

        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}

        <div className="mt-6">
          <Button onClick={handleSubmit} disabled={!isValid} loading={isSubmitting} className="w-full">
            Create route
          </Button>
        </div>
      </Card>
    </div>
  );
}
