// Hand-mirrored from the backend's Prisma models and DTOs, same approach
// and same caveat as mobile/src/api/types.ts: there's no shared package
// between the backend and its two clients, so if a backend response shape
// changes, this file has to be updated by hand — nothing enforces the mirror.

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
  identityLast4: string;
  dateOfBirth: string | null;
  gender: 'male' | 'female' | 'other' | null;
  address: string | null;
  mobile: string | null;
  emergencyContactName: string | null;
  emergencyContactMobile: string | null;
  medicalDeclaration: boolean;
  isGuide: boolean;
  guideRegistrationNo: string | null;
  status: ParticipantStatus;
  officerRemark: string | null;
  resubmitted: boolean;
  reviewedAt: string | null;
  documents: AppDocument[];
}

// GET /participants/:id's extra field — see backend/src/participants/participants.service.ts findForReview().
export interface PriorRejection {
  id: string;
  fullName: string;
  reviewedAt: string;
  officerRemark: string | null;
  application: { reference: string; trekRoute: { name: string } };
}

export interface ParticipantDetail extends Participant {
  priorRejections: PriorRejection[];
}

export interface Permit {
  id: string;
  reference: string;
  qrPayload: string;
  validFrom: string;
  validUntil: string;
  status: 'active' | 'revoked';
}

export interface Application {
  id: string;
  reference: string;
  type: 'individual' | 'group';
  groupType: 'private' | 'commercial' | null;
  trekRouteId: string;
  startDate: string;
  endDate: string;
  status: ApplicationStatus;
  rejectionReason: string | null;
  operatorName: string | null;
  operatorRegistrationNo: string | null;
  submittedAt: string | null;
  participants: Participant[];
  permits?: Permit[];
  // Only the list endpoint (GET /applications) includes this — see
  // backend/src/applications/applications.service.ts's ApplicationListItem.
  // findOneForUser (the detail endpoint) doesn't, same optionality pattern
  // as `permits` above.
  applicant?: { id: string; fullName: string | null; mobile: string };
}

// Mirrors backend/src/audit/audit.service.ts's AuditLogEntry (AuditLog +
// its joined actor). entityType is a free-form string set by whichever
// service logged it ('application', 'participant', 'permit', 'trek_route',
// 'document', 'user') — not modeled as a union here since nothing on the
// dashboard branches on it beyond display.
export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: unknown;
  ipAddress: string | null;
  createdAt: string;
  actor: { id: string; fullName: string | null; mobile: string; role: UserRole } | null;
}

export type NotificationType =
  | 'application_status_changed'
  | 'correction_requested'
  | 'permit_issued'
  | 'permit_revoked';

// Mirrors backend/src/notifications/notifications.service.ts's Notification.
export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType: string;
  entityId: string;
  isRead: boolean;
  createdAt: string;
}

// The structured 400/409 bodies submit() and issue() send — see
// backend/src/applications/applications.service.ts / permits.service.ts.
export interface UnresolvedParticipant {
  id: string;
  fullName: string;
  // Always PENDING or CORRECTION_REQUESTED in practice (see
  // permits.service.ts issue()) — typed loosely as `string` here since
  // it arrives as untyped JSON off ApiError, same as ApiError.unresolved
  // itself.
  status: string;
}
