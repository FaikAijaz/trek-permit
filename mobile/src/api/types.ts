// Hand-mirrored from the backend's Prisma models and DTOs (backend/prisma/schema.prisma,
// backend/src/**/dto/*.ts). There's no shared package between the two apps in this pilot,
// so these are kept intentionally narrow — only the fields the mobile screens actually use.

export type UserRole = 'trekker' | 'officer' | 'admin';

export interface AuthUser {
  id: string;
  mobile: string;
  fullName: string | null;
  role: UserRole;
}

export interface AuthResult {
  accessToken: string;
  user: AuthUser;
}

export type RouteDifficulty = 'easy' | 'moderate' | 'difficult';

export interface TrekRoute {
  id: string;
  name: string;
  region: string;
  description: string | null;
  difficulty: RouteDifficulty | null;
  isOpen: boolean;
  requiredDocuments: DocumentType[];
  capacityPerDay: number | null;
  minLeadTimeDays: number;
}

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'permit_issued';

export type ParticipantStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CORRECTION_REQUESTED'
  | 'EXCLUDED'
  | 'REVOKED';

export type DocumentType =
  | 'aadhaar'
  | 'fitness_certificate'
  | 'photograph'
  | 'guardian_consent'
  | 'other';

export interface AppDocument {
  id: string;
  documentType: DocumentType;
  originalFilename: string;
  version: number;
  isCurrent: boolean;
  uploadedAt: string;
}

export interface Participant {
  id: string;
  isLeader: boolean;
  fullName: string;
  identityNumber: string;
  dateOfBirth: string | null;
  gender: 'male' | 'female' | 'other' | null;
  address: string | null;
  mobile: string | null;
  emergencyContactName: string | null;
  emergencyContactMobile: string | null;
  medicalDeclaration: boolean;
  status: ParticipantStatus;
  officerRemark: string | null;
  resubmitted: boolean;
  documents: AppDocument[];
}

export interface Permit {
  id: string;
  reference: string;
  qrPayload: string;
  validFrom: string;
  validUntil: string;
  status: 'active' | 'revoked';
}

// Mirrors backend/src/permits/permits.service.ts's PermitPayload — the JSON
// half of a scanned QR's `<json>.<signature>` string (BUILD_SPEC.md Section
// 5). Short keys are the spec's, not a mobile-side abbreviation.
export interface PermitPayload {
  v: number;
  pid: string;
  typ: 'individual' | 'group';
  gid?: string;
  gt?: 'private' | 'commercial';
  op?: { n: string; r: string };
  ldr: string;
  rt: string;
  rid: string;
  f: string;
  t: string;
  n?: number;
  m?: { n: string; i: string }[];
  iat: string;
}

export interface Application {
  id: string;
  reference: string;
  type: 'individual' | 'group';
  trekRouteId: string;
  startDate: string;
  endDate: string;
  status: ApplicationStatus;
  rejectionReason: string | null;
  participants: Participant[];
  permits?: Permit[];
}
