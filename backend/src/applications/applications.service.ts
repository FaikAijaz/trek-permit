import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Application, DocumentType, Participant, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ReferenceService } from '../reference/reference.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ParticipantDto } from './dto/participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';

type ApplicationWithParticipants = Application & {
  participants: Participant[];
};

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly referenceService: ReferenceService,
  ) {}

  /** Maps the shared personal-details DTO onto Prisma's participant fields. */
  private toParticipantData(
    dto: ParticipantDto,
    isLeader: boolean,
  ): Prisma.ParticipantCreateWithoutApplicationInput {
    return {
      isLeader,
      fullName: dto.fullName,
      identityNumber: dto.identityNumber,
      identityLast4: dto.identityNumber.slice(-4),
      dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      gender: dto.gender,
      address: dto.address,
      mobile: dto.mobile,
      emergencyContactName: dto.emergencyContactName,
      emergencyContactMobile: dto.emergencyContactMobile,
      medicalDeclaration: dto.medicalDeclaration ?? false,
      isGuide: dto.isGuide ?? false,
      guideRegistrationNo: dto.guideRegistrationNo,
      status: 'PENDING',
    };
  }

  async create(
    dto: CreateApplicationDto,
    applicantUserId: string,
  ): Promise<ApplicationWithParticipants> {
    const route = await this.prisma.trekRoute.findUnique({
      where: { id: dto.trekRouteId },
    });
    if (!route) {
      throw new NotFoundException(`No trek route with id ${dto.trekRouteId}`);
    }
    if (!route.isOpen) {
      throw new BadRequestException(
        'This route is not currently open for applications',
      );
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);
    if (endDate < startDate) {
      throw new BadRequestException('endDate cannot be before startDate');
    }

    // The DTO's @ValidateIf already guarantees groupType/operator fields are
    // present *when relevant* — this guards the opposite case, an individual
    // application carrying group-only data, which @ValidateIf lets through
    // unvalidated (it isn't required, but it also isn't forbidden there).
    if (dto.type === 'individual' && dto.groupType) {
      throw new BadRequestException(
        'groupType must not be set on an individual application',
      );
    }

    const isCommercial = dto.type === 'group' && dto.groupType === 'commercial';
    const reference = await this.referenceService.generate(
      dto.type === 'group' ? 'GRP' : 'APP',
      dto.type === 'group' ? 'GRP' : 'APP',
    );

    const application = await this.prisma.application.create({
      data: {
        reference,
        type: dto.type,
        groupType: dto.type === 'group' ? dto.groupType : undefined,
        operatorRegistrationNo: isCommercial
          ? dto.operatorRegistrationNo
          : undefined,
        operatorName: isCommercial ? dto.operatorName : undefined,
        operatorRegValidUntil: isCommercial
          ? new Date(dto.operatorRegValidUntil!)
          : undefined,
        applicantUserId,
        trekRouteId: dto.trekRouteId,
        startDate,
        endDate,
        status: 'draft',
        participants: {
          create: this.toParticipantData(dto.leader, true),
        },
      },
      include: { participants: true },
    });

    await this.auditService.log({
      actorUserId: applicantUserId,
      action: 'application.created',
      entityType: 'application',
      entityId: application.id,
      metadata: { reference: application.reference, type: application.type },
    });

    return application;
  }

  async findAllForUser(applicantUserId: string): Promise<Application[]> {
    return this.prisma.application.findMany({
      where: { applicantUserId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForUser(
    id: string,
    requestingUserId: string,
    requestingUserRole: string,
  ): Promise<ApplicationWithParticipants> {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: { participants: { include: { documents: true } } },
    });

    if (!application) {
      throw new NotFoundException(`No application with id ${id}`);
    }

    const isOwner = application.applicantUserId === requestingUserId;
    const isStaff =
      requestingUserRole === 'officer' || requestingUserRole === 'admin';

    if (!isOwner && !isStaff) {
      throw new ForbiddenException('This application does not belong to you');
    }

    return application;
  }

  /** Fetches the application and confirms the requester owns it and it's still editable. */
  async getEditableOwnApplication(
    id: string,
    applicantUserId: string,
  ): Promise<ApplicationWithParticipants> {
    const application = await this.prisma.application.findUnique({
      where: { id },
      include: { participants: true },
    });

    if (!application) {
      throw new NotFoundException(`No application with id ${id}`);
    }
    if (application.applicantUserId !== applicantUserId) {
      throw new ForbiddenException('This application does not belong to you');
    }
    if (application.status !== 'draft') {
      throw new BadRequestException(
        `Cannot modify an application in status '${application.status}'`,
      );
    }

    return application;
  }

  /** Adds a group member. Individual applications never call this — they have only their leader. */
  async addParticipant(
    applicationId: string,
    dto: ParticipantDto,
    applicantUserId: string,
  ): Promise<Participant> {
    const application = await this.getEditableOwnApplication(
      applicationId,
      applicantUserId,
    );

    if (application.type !== 'group') {
      throw new BadRequestException(
        'Only a group application can have additional members',
      );
    }

    const participant = await this.prisma.participant.create({
      data: {
        ...this.toParticipantData(dto, false),
        application: { connect: { id: application.id } },
      },
    });

    await this.auditService.log({
      actorUserId: applicantUserId,
      action: 'participant.added',
      entityType: 'participant',
      entityId: participant.id,
      metadata: { applicationId: application.id },
    });

    return participant;
  }

  /** Finds one participant belonging to this application, or 404s. Shared by update/remove so both fail the same way for a mismatched id. */
  private findOwnedParticipant(
    application: ApplicationWithParticipants,
    participantId: string,
  ): Participant {
    const participant = application.participants.find(
      (p) => p.id === participantId,
    );
    if (!participant) {
      throw new NotFoundException(
        `No participant with id ${participantId} on this application`,
      );
    }
    return participant;
  }

  async updateParticipant(
    applicationId: string,
    participantId: string,
    dto: UpdateParticipantDto,
    applicantUserId: string,
  ): Promise<Participant> {
    const application = await this.getEditableOwnApplication(
      applicationId,
      applicantUserId,
    );
    const target = this.findOwnedParticipant(application, participantId);

    const participant = await this.prisma.participant.update({
      where: { id: target.id },
      data: {
        ...dto,
        identityLast4: dto.identityNumber
          ? dto.identityNumber.slice(-4)
          : undefined,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
    });

    await this.auditService.log({
      actorUserId: applicantUserId,
      action: 'participant.updated',
      entityType: 'participant',
      entityId: participant.id,
      metadata: { fields: Object.keys(dto) },
    });

    return participant;
  }

  /** Removes a group member while the application is still a draft. The leader can't be removed this way — an application without a leader isn't valid, so that requires discarding the whole application instead. */
  async removeParticipant(
    applicationId: string,
    participantId: string,
    applicantUserId: string,
  ): Promise<void> {
    const application = await this.getEditableOwnApplication(
      applicationId,
      applicantUserId,
    );
    const target = this.findOwnedParticipant(application, participantId);

    if (target.isLeader) {
      throw new BadRequestException(
        'Cannot remove the trek leader from an application',
      );
    }

    try {
      await this.prisma.participant.delete({ where: { id: target.id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Cannot remove a member who already has uploaded documents',
        );
      }
      throw error;
    }

    await this.auditService.log({
      actorUserId: applicantUserId,
      action: 'participant.removed',
      entityType: 'participant',
      entityId: participantId,
      metadata: { applicationId: application.id },
    });
  }

  async submit(
    applicationId: string,
    applicantUserId: string,
  ): Promise<Application> {
    const application = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        trekRoute: true,
        participants: { include: { documents: true } },
      },
    });

    if (!application) {
      throw new NotFoundException(`No application with id ${applicationId}`);
    }
    if (application.applicantUserId !== applicantUserId) {
      throw new ForbiddenException('This application does not belong to you');
    }
    if (application.status !== 'draft') {
      throw new BadRequestException(
        `Cannot submit an application in status '${application.status}'`,
      );
    }

    const leader = application.participants.find((p) => p.isLeader);
    if (!leader) {
      throw new NotFoundException('No leader participant on this application');
    }

    const reasons: string[] = [];
    const { trekRoute } = application;

    if (!trekRoute.isOpen) {
      reasons.push('This route is no longer open for applications');
    }

    const earliestStart = new Date();
    earliestStart.setDate(earliestStart.getDate() + trekRoute.minLeadTimeDays);
    if (application.startDate < earliestStart) {
      reasons.push(
        `Start date must be at least ${trekRoute.minLeadTimeDays} days from today`,
      );
    }

    if (!leader.emergencyContactName || !leader.emergencyContactMobile) {
      reasons.push('Emergency contact name and mobile are required');
    }
    if (!leader.medicalDeclaration) {
      reasons.push('Medical fitness declaration must be confirmed');
    }

    // Only the leader's documents gate submission. Members can still be
    // missing documents at this point — that's expected: BUILD_SPEC.md
    // Section 2, #5 has the officer issuing permits even while some members
    // remain unresolved, so incomplete members are a review-time concern
    // (CORRECTION_REQUESTED / EXCLUDED), not a submission blocker.
    const requiredDocumentTypes = (trekRoute.requiredDocuments ??
      []) as DocumentType[];
    const currentDocumentTypes = new Set(
      leader.documents.filter((d) => d.isCurrent).map((d) => d.documentType),
    );
    for (const docType of requiredDocumentTypes) {
      if (!currentDocumentTypes.has(docType)) {
        reasons.push(`Missing required document: ${docType}`);
      }
    }

    if (reasons.length > 0) {
      throw new BadRequestException({
        message: 'Application is not ready to submit',
        reasons,
      });
    }

    const submitted = await this.prisma.application.update({
      where: { id: applicationId },
      data: { status: 'submitted', submittedAt: new Date() },
    });

    await this.auditService.log({
      actorUserId: applicantUserId,
      action: 'application.submitted',
      entityType: 'application',
      entityId: application.id,
      metadata: { reference: application.reference },
    });

    return submitted;
  }
}
