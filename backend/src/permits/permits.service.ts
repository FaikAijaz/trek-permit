import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Permit } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ReferenceService } from '../reference/reference.service';
import { SigningService } from './signing.service';
import { IssuePermitDto } from './dto/issue-permit.dto';
import { RevokePermitDto } from './dto/revoke-permit.dto';

/**
 * BUILD_SPEC.md Section 5 — the exact payload that gets signed and encoded
 * into the QR. Keys are short deliberately: QR codes have limited capacity.
 * `gid`/`gt`/`op`/`n`/`m` are only ever present for a group application
 * (and `op` only for a commercial one) — JSON.stringify drops `undefined`
 * fields on its own, so building this with optional spreads is enough to
 * get the "omitted for individual/private" behaviour the spec asks for.
 */
interface PermitPayload {
  v: number;
  pid: string;
  typ: string;
  gid?: string;
  gt?: string;
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

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

@Injectable()
export class PermitsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly referenceService: ReferenceService,
    private readonly signingService: SigningService,
  ) {}

  /**
   * The officer's explicit "Issue Permit" click (BUILD_SPEC.md Section 2,
   * #1). Only ever runs on an already-`approved` application — approve()
   * already checked leader+1-member-approved, and nothing can change a
   * participant's status between approval and issuance (decide() only
   * accepts submitted/under_review applications), so that gate can't have
   * gone stale by the time we get here.
   */
  async issue(
    applicationId: string,
    dto: IssuePermitDto,
    officerId: string,
  ): Promise<Permit> {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { participants: true, trekRoute: true },
    });
    if (!application) {
      throw new NotFoundException(`No application with id ${applicationId}`);
    }
    if (application.status !== 'approved') {
      throw new BadRequestException(
        `Cannot issue a permit for an application in status '${application.status}'`,
      );
    }

    const unresolved = application.participants.filter(
      (p) => p.status === 'PENDING' || p.status === 'CORRECTION_REQUESTED',
    );

    // BUILD_SPEC.md Section 2, #5: warn first, only exclude on explicit
    // confirmation. Nothing is written yet on this branch.
    if (unresolved.length > 0 && !dto.confirmExclusions) {
      throw new ConflictException({
        message:
          'Some participants are still unresolved. Resubmit with confirmExclusions: true to issue anyway and exclude them.',
        unresolved: unresolved.map((p) => ({
          id: p.id,
          fullName: p.fullName,
          status: p.status,
        })),
      });
    }

    const approvedParticipants = application.participants.filter(
      (p) => p.status === 'APPROVED',
    );
    const leader = approvedParticipants.find((p) => p.isLeader);
    if (!leader) {
      // Can't happen given the gate above, but a permit naming no leader is
      // not something to ever construct, silently or otherwise.
      throw new BadRequestException('No approved leader on this application');
    }

    const reference = await this.referenceService.generate('PMT', 'PMT');
    const isGroup = application.type === 'group';
    const isCommercial = application.groupType === 'commercial';

    const payload: PermitPayload = {
      v: 1,
      pid: reference,
      typ: application.type,
      ...(isGroup
        ? { gid: application.reference, gt: application.groupType! }
        : {}),
      ...(isCommercial
        ? {
            op: {
              n: application.operatorName!,
              r: application.operatorRegistrationNo!,
            },
          }
        : {}),
      ldr: leader.fullName,
      rt: application.trekRoute.name,
      rid: application.trekRoute.id,
      f: toDateOnly(application.startDate),
      t: toDateOnly(application.endDate),
      ...(isGroup
        ? {
            n: approvedParticipants.length,
            m: approvedParticipants.map((p) => ({
              n: p.fullName,
              i: p.identityLast4,
            })),
          }
        : {}),
      iat: new Date().toISOString(),
    };

    const signedPayload = JSON.stringify(payload);
    const signature = this.signingService.sign(signedPayload);
    // A simple dot-separated combination, not base64-wrapping the whole
    // thing — the payload is already compact JSON, and base64 would only
    // spend more of the QR's limited capacity encoding it further.
    const qrPayload = `${signedPayload}.${signature}`;

    const [permit] = await this.prisma.$transaction([
      this.prisma.permit.create({
        data: {
          reference,
          applicationId: application.id,
          schemaVersion: 1,
          signedPayload,
          signature,
          qrPayload,
          validFrom: application.startDate,
          validUntil: application.endDate,
          issuedById: officerId,
          status: 'active',
        },
      }),
      ...unresolved.map((p) =>
        this.prisma.participant.update({
          where: { id: p.id },
          data: { status: 'EXCLUDED' },
        }),
      ),
      this.prisma.application.update({
        where: { id: application.id },
        data: { status: 'permit_issued' },
      }),
    ]);

    await this.auditService.log({
      actorUserId: officerId,
      action: 'permit.issued',
      entityType: 'permit',
      entityId: permit.id,
      metadata: {
        reference: permit.reference,
        applicationId: application.id,
        excludedCount: unresolved.length,
      },
    });

    for (const p of unresolved) {
      await this.auditService.log({
        actorUserId: officerId,
        action: 'participant.excluded',
        entityType: 'participant',
        entityId: p.id,
        metadata: { applicationId: application.id },
      });
    }

    return permit;
  }

  async findOneForUser(
    id: string,
    requestingUserId: string,
    requestingUserRole: string,
  ): Promise<Permit> {
    const permit = await this.prisma.permit.findUnique({
      where: { id },
      include: { application: true },
    });
    if (!permit) {
      throw new NotFoundException(`No permit with id ${id}`);
    }

    const isOwner = permit.application.applicantUserId === requestingUserId;
    const isStaff =
      requestingUserRole === 'officer' || requestingUserRole === 'admin';
    if (!isOwner && !isStaff) {
      throw new ForbiddenException('This permit does not belong to you');
    }

    return permit;
  }

  /**
   * Admin-only. BUILD_SPEC.md Section 3's state table has exactly one
   * transition reserved for an admin rather than an officer:
   * `APPROVED → REVOKED (admin only, after issuance)`. RolesGuard enforces
   * the "admin only" half; this enforces the rest — every currently
   * APPROVED participant on the application loses that status too, since
   * their entitlement came from this permit.
   */
  async revoke(
    permitId: string,
    dto: RevokePermitDto,
    adminId: string,
  ): Promise<void> {
    const permit = await this.prisma.permit.findUnique({
      where: { id: permitId },
      include: { application: { include: { participants: true } } },
    });
    if (!permit) {
      throw new NotFoundException(`No permit with id ${permitId}`);
    }
    if (permit.status !== 'active') {
      throw new BadRequestException(
        `Cannot revoke a permit in status '${permit.status}'`,
      );
    }

    const approvedParticipants = permit.application.participants.filter(
      (p) => p.status === 'APPROVED',
    );

    await this.prisma.$transaction([
      this.prisma.permit.update({
        where: { id: permit.id },
        data: { status: 'revoked' },
      }),
      this.prisma.revocation.create({
        data: {
          permitId: permit.id,
          reason: dto.reason,
          revokedById: adminId,
        },
      }),
      ...approvedParticipants.map((p) =>
        this.prisma.participant.update({
          where: { id: p.id },
          data: { status: 'REVOKED' },
        }),
      ),
    ]);

    await this.auditService.log({
      actorUserId: adminId,
      action: 'permit.revoked',
      entityType: 'permit',
      entityId: permit.id,
      metadata: { reference: permit.reference, reason: dto.reason },
    });
  }
}
