import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Participant, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  DecideParticipantDto,
  ParticipantDecision,
} from './dto/decide-participant.dto';

/**
 * BUILD_SPEC.md Section 3 — the only legal decisions an officer can make
 * from each starting status. `decide()` below is the single place in the
 * codebase that writes participants.status; nothing else may.
 *
 * Two transitions from the spec's table are intentionally absent here:
 * `→ EXCLUDED` (permit issuance sets that automatically) and
 * `CORRECTION_REQUESTED → PENDING` (the leader triggers that by
 * re-uploading a document — see documents.service.ts).
 */
const LEGAL_DECISIONS: Partial<Record<string, ParticipantDecision[]>> = {
  PENDING: ['APPROVED', 'REJECTED', 'CORRECTION_REQUESTED'],
  CORRECTION_REQUESTED: ['APPROVED', 'REJECTED'],
};

const TWELVE_MONTHS_MS = 365 * 24 * 60 * 60 * 1000;

@Injectable()
export class ParticipantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /** Everything an officer needs on one screen to decide this person. */
  async findForReview(participantId: string) {
    const participant = await this.prisma.participant.findUnique({
      where: { id: participantId },
      include: {
        documents: true,
        application: { include: { trekRoute: true } },
      },
    });
    if (!participant) {
      throw new NotFoundException(`No participant with id ${participantId}`);
    }

    // BUILD_SPEC.md Section 4, "Prior rejections": informational only, never
    // a block — the officer decides what to do with it.
    const priorRejections = await this.prisma.participant.findMany({
      where: {
        identityNumber: participant.identityNumber,
        status: 'REJECTED',
        reviewedAt: { gt: new Date(Date.now() - TWELVE_MONTHS_MS) },
        NOT: { id: participant.id },
      },
      select: {
        id: true,
        fullName: true,
        reviewedAt: true,
        officerRemark: true,
        application: {
          select: { reference: true, trekRoute: { select: { name: true } } },
        },
      },
      orderBy: { reviewedAt: 'desc' },
    });

    return { ...participant, priorRejections };
  }

  async decide(
    participantId: string,
    dto: DecideParticipantDto,
    officerId: string,
  ): Promise<Participant> {
    const participant = await this.prisma.participant.findUnique({
      where: { id: participantId },
      include: { application: true },
    });
    if (!participant) {
      throw new NotFoundException(`No participant with id ${participantId}`);
    }

    const { application } = participant;
    if (
      application.status !== 'submitted' &&
      application.status !== 'under_review'
    ) {
      throw new BadRequestException(
        `Cannot review a participant while the application is '${application.status}'`,
      );
    }

    const allowed = LEGAL_DECISIONS[participant.status] ?? [];
    if (!allowed.includes(dto.decision)) {
      throw new BadRequestException(
        `Cannot move participant from '${participant.status}' to '${dto.decision}'`,
      );
    }

    if (dto.decision !== 'APPROVED' && !dto.remark) {
      throw new BadRequestException(
        'remark is required when rejecting or requesting a correction',
      );
    }

    const now = new Date();

    // At most one of these applies, computed up front so the transaction
    // below issues exactly one application update, not two racing writes.
    let applicationUpdate: Prisma.ApplicationUpdateInput | null = null;
    if (participant.isLeader && dto.decision === 'REJECTED') {
      // BUILD_SPEC.md Section 2, #2: no leader, no group — the whole
      // application fails with them, application-level, not just the member.
      applicationUpdate = {
        status: 'rejected',
        rejectionReason: `Trek leader rejected: ${dto.remark}`,
        decidedAt: now,
        decidedBy: { connect: { id: officerId } },
      };
    } else if (application.status === 'submitted') {
      // The first decision made on a submitted application is what moves it
      // into review — there's no separate "start review" click to forget.
      applicationUpdate = { status: 'under_review' };
    }

    const [updatedParticipant] = await this.prisma.$transaction([
      this.prisma.participant.update({
        where: { id: participant.id },
        data: {
          status: dto.decision,
          officerRemark: dto.remark ?? null,
          // This decision *is* the officer's next review of the participant
          // — see BUILD_SPEC.md Section 3: "Reset it to false when the
          // officer next reviews."
          resubmitted: false,
          reviewedAt: now,
          reviewedById: officerId,
        },
      }),
      ...(applicationUpdate
        ? [
            this.prisma.application.update({
              where: { id: application.id },
              data: applicationUpdate,
            }),
          ]
        : []),
    ]);

    await this.auditService.log({
      actorUserId: officerId,
      action: `participant.${dto.decision.toLowerCase()}`,
      entityType: 'participant',
      entityId: participant.id,
      metadata: { applicationId: application.id, remark: dto.remark },
    });

    if (applicationUpdate?.status === 'rejected') {
      await this.auditService.log({
        actorUserId: officerId,
        action: 'application.rejected',
        entityType: 'application',
        entityId: application.id,
        metadata: {
          reference: application.reference,
          reason: 'leader_rejected',
        },
      });
    }

    return updatedParticipant;
  }
}
