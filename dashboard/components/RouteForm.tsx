'use client';

import { RouteInput } from '@/lib/api/routes';
import { DocumentType, RouteDifficulty } from '@/lib/types';
import { Input } from '@/components/Input';
import { Textarea } from '@/components/Textarea';

const DOCUMENT_TYPES: DocumentType[] = [
  'aadhaar',
  'fitness_certificate',
  'photograph',
  'guardian_consent',
  'other',
];

const DIFFICULTIES: RouteDifficulty[] = ['easy', 'moderate', 'difficult'];

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
      <Input
        label="Name"
        className="w-full"
        value={value.name}
        onChange={(e) => onChange({ name: e.target.value })}
        placeholder="Tarsar Marsar"
      />

      <Input
        label="Region"
        className="w-full"
        value={value.region}
        onChange={(e) => onChange({ region: e.target.value })}
        placeholder="Kashmir"
      />

      <Textarea
        label="Description"
        className="w-full"
        rows={3}
        value={value.description ?? ''}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="Optional"
      />

      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Difficulty</label>
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
        <label className="mb-1.5 block text-sm font-medium text-gray-700">Required documents</label>
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
        <Input
          label="Capacity per day"
          className="w-full"
          type="number"
          min={1}
          value={value.capacityPerDay ?? ''}
          onChange={(e) =>
            onChange({
              capacityPerDay: e.target.value === '' ? undefined : Number(e.target.value),
            })
          }
          placeholder="Unlimited"
          wrapperClassName="flex-1"
        />
        <Input
          label="Minimum lead time (days)"
          className="w-full"
          type="number"
          min={0}
          value={value.minLeadTimeDays ?? ''}
          onChange={(e) =>
            onChange({
              minLeadTimeDays: e.target.value === '' ? undefined : Number(e.target.value),
            })
          }
          wrapperClassName="flex-1"
        />
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
