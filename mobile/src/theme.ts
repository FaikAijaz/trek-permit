export const colors = {
  background: '#ffffff',
  surface: '#f5f5f5',
  text: '#1a1a1a',
  muted: '#6b6b6b',
  border: '#d9d9d9',
  primary: '#2e7d32',
  danger: '#c0392b',
  warning: '#b8860b',
};

// One palette for both application status (lowercase) and participant
// status (UPPERCASE) — the two enums never overlap in value, so a single
// lookup table is simpler than keeping two.
export const statusColors: Record<string, string> = {
  draft: colors.muted,
  submitted: '#1976d2',
  under_review: '#f57c00',
  approved: colors.primary,
  rejected: colors.danger,
  permit_issued: '#6a1b9a',
  PENDING: colors.muted,
  APPROVED: colors.primary,
  REJECTED: colors.danger,
  CORRECTION_REQUESTED: '#f57c00',
  EXCLUDED: '#616161',
  REVOKED: colors.danger,
};

export function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').toLowerCase();
}
