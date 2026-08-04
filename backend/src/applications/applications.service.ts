import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Application, DocumentType, Participant } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ReferenceService } from '../reference/reference.service';
import { CreateApplicationDto } from './dto/create-application.dto';
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

    const reference = await this.referenceService.generate(
      'APP',
      'application',
    );

    const application = await this.prisma.application.create({
      data: {
        reference,
        type: 'individual',
        applicantUserId,
        trekRouteId: dto.trekRouteId,
        startDate,
        endDate,
        status: 'draft',
        participants: {
          create: {
            isLeader: true,
            fullName: dto.applicant.fullName,
            identityNumber: dto.applicant.identityNumber,
            identityLast4: dto.applicant.identityNumber.slice(-4),
            dateOfBirth: dto.applicant.dateOfBirth
              ? new Date(dto.applicant.dateOfBirth)
              : undefined,
            gender: dto.applicant.gender,
            address: dto.applicant.address,
            mobile: dto.applicant.mobile,
            emergencyContactName: dto.applicant.emergencyContactName,
            emergencyContactMobile: dto.applicant.emergencyContactMobile,
            medicalDeclaration: dto.applicant.medicalDeclaration ?? false,
            status: 'PENDING',
          },
        },
      },
      include: { participants: true },
    });

    await this.auditService.log({
      actorUserId: applicantUserId,
      action: 'application.created',
      entityType: 'application',
      entityId: application.id,
      metadata: { reference: application.reference },
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

  async updateParticipant(
    applicationId: string,
    dto: UpdateParticipantDto,
    applicantUserId: string,
  ): Promise<Participant> {
    const application = await this.getEditableOwnApplication(
      applicationId,
      applicantUserId,
    );

    const leader = application.participants.find((p) => p.isLeader);
    if (!leader) {
      // Cannot happen for an individual application created via create(),
      // which always creates its leader participant in the same transaction.
      throw new NotFoundException('No leader participant on this application');
    }

    const participant = await this.prisma.participant.update({
      where: { id: leader.id },
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
