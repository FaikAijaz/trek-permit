import { IsIn, IsOptional, IsString, Length } from 'class-validator';

// Deliberately narrower than the full ParticipantStatus enum: EXCLUDED is
// set automatically at permit issuance (BUILD_SPEC.md Section 2, #5) and
// REVOKED only applies to an already-issued permit. An officer reviewing a
// pending application can only ever choose one of these three.
const DECISIONS = ['APPROVED', 'REJECTED', 'CORRECTION_REQUESTED'] as const;
export type ParticipantDecision = (typeof DECISIONS)[number];

export class DecideParticipantDto {
  @IsIn(DECISIONS)
  decision!: ParticipantDecision;

  // Required for REJECTED/CORRECTION_REQUESTED (checked in the service,
  // since the requirement depends on `decision`) — the leader needs to know
  // why. Optional on APPROVED, which is self-explanatory.
  @IsOptional()
  @IsString()
  @Length(1, 2000)
  remark?: string;
}
