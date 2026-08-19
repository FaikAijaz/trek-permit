// One lookup table for application status (lowercase) and participant
// status (UPPERCASE) — same reasoning as mobile/src/theme.ts: the two
// enums never overlap in value, so a single table is simpler than two.
export const statusStyles: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-300',
  submitted: 'bg-blue-50 text-blue-700 border-blue-300',
  under_review: 'bg-amber-50 text-amber-700 border-amber-300',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  rejected: 'bg-red-50 text-red-700 border-red-300',
  permit_issued: 'bg-purple-50 text-purple-700 border-purple-300',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  revoked: 'bg-red-50 text-red-700 border-red-300',
  PENDING: 'bg-gray-100 text-gray-700 border-gray-300',
  APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  REJECTED: 'bg-red-50 text-red-700 border-red-300',
  CORRECTION_REQUESTED: 'bg-amber-50 text-amber-700 border-amber-300',
  EXCLUDED: 'bg-gray-100 text-gray-500 border-gray-300',
  REVOKED: 'bg-red-50 text-red-700 border-red-300',
};

export function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').toLowerCase();
}
