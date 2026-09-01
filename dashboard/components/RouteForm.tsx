'use client';

import { RouteInput } from '@/lib/api/routes';
import { DocumentType, RouteDifficulty } from '@/lib/types';

const DOCUMENT_TYPES: DocumentType[] = [
  'aadhaar',
  'fitness_certificate',
  'photograph',
  'guardian_consent',
  'other',
];

const DIFFICULTIES: RouteDifficulty[] = ['easy', 'moderate', 'difficult'];

const inputClass =
  'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600';
const labelClass = 'mb-1.5 block text-sm font-medium text-gray-700';

/** Shared by the new-route and edit-route pages — mirrors
 * backend/src/routes/dto/create-route.dto.ts (update-route.dto.ts is just
 * PartialType(CreateRouteDto), same shape here). */
export function RouteForm({
  value,
  onChange,
}: {
  value: RouteInput;
  onChange: (patch: Partial<RouteInput>) => void;
}) {
  const requiredDocuments = value.requiredDocuments ?? [];

  function toggleDocument(doc: DocumentType) {
    onChange({
      requiredDocuments: requiredDocuments.includes(doc)
        ? requiredDocuments.filter((d) => d !== doc)
        : [...requiredDocuments, doc],
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <label className={labelClass}>Name</label>
        <input
          className={inputClass}
          value={value.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="Tarsar Marsar"
        />
      </div>

      <div>
        <label className={labelClass}>Region</label>
        <input
          className={inputClass}
          value={value.region}
          onChange={(e) => onChange({ region: e.target.value })}
          placeholder="Kashmir"
        />
      </div>

      <div>
        <label className={labelClass}>Description</label>
        <textarea
          className={inputClass}
          rows={3}
          value={value.description ?? ''}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Optional"
        />
      </div>

      <div>
        <label className={labelClass}>Difficulty</label>
        <div className="flex gap-2">
          {DIFFICULTIES.map((d) => {
            const selected = value.difficulty === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => onChange({ difficulty: selected ? undefined : d })}
                className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                  selected
                    ? 'border-emerald-700 bg-emerald-700 text-white'
                    : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className={labelClass}>Required documents</label>
        <div className="flex flex-wrap gap-2">
          {DOCUMENT_TYPES.map((doc) => {
            const selected = requiredDocuments.includes(doc);
            return (
              <button
                key={doc}
                type="button"
                onClick={() => toggleDocument(doc)}
                className={`rounded-full border px-3 py-1 text-sm font-medium capitalize transition-colors ${
                  selected
                    ? 'border-emerald-700 bg-emerald-700 text-white'
                    : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {doc.replace(/_/g, ' ')}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className={labelClass}>Capacity per day</label>
          <input
            className={inputClass}
            type="number"
            min={1}
            value={value.capacityPerDay ?? ''}
            onChange={(e) =>
              onChange({
                capacityPerDay: e.target.value === '' ? undefined : Number(e.target.value),
              })
            }
            placeholder="Unlimited"
          />
        </div>
        <div className="flex-1">
          <label className={labelClass}>Minimum lead time (days)</label>
          <input
            className={inputClass}
            type="number"
            min={0}
            value={value.minLeadTimeDays ?? ''}
            onChange={(e) =>
              onChange({
                minLeadTimeDays: e.target.value === '' ? undefined : Number(e.target.value),
              })
            }
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={!!value.isOpen}
          onChange={(e) => onChange({ isOpen: e.target.checked })}
          className="h-4 w-4 rounded border-gray-300 text-emerald-700 focus:ring-emerald-600"
        />
        Open for applications
      </label>
    </div>
  );
}
