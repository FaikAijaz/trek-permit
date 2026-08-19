import { extname } from 'node:path';
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Document, DocumentType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ApplicationsService } from '../applications/applications.service';
import { StorageService } from './storage.service';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly applicationsService: ApplicationsService,
    private readonly storageService: StorageService,
  ) {}

  async upload(
    applicationId: string,
    participantId: string,
    documentType: DocumentType,
    file: Express.Multer.File,
    uploaderUserId: string,
  ): Promise<Document> {
    const { participant, isCorrection } =
      await this.applicationsService.getApplicationForDocumentUpload(
        applicationId,
        participantId,
        uploaderUserId,
      );

    // Never overwrite: find the current document of this type (if any) and
    // supersede it, rather than mutating it in place.
    const existing = await this.prisma.document.findFirst({
      where: { participantId: participant.id, documentType, isCurrent: true },
    });
    const version = existing ? existing.version + 1 : 1;

    const ext = extname(file.originalname).toLowerCase();
    const storageKey = `${participant.id}/${documentType}_v${version}${ext}`;
    await this.storageService.save(storageKey, file.buffer);

    if (existing) {
      await this.prisma.document.update({
        where: { id: existing.id },
        data: { isCurrent: false },
      });
    }

    const document = await this.prisma.document.create({
      data: {
        participantId: participant.id,
        documentType,
        storageKey,
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        version,
        isCurrent: true,
      },
    });

    await this.auditService.log({
      actorUserId: uploaderUserId,
      action: 'document.uploaded',
      entityType: 'document',
      entityId: document.id,
      metadata: { documentType, version, participantId: participant.id },
    });

    // BUILD_SPEC.md Section 3: CORRECTION_REQUESTED → PENDING happens the
    // moment the leader re-uploads — it's the applicant's action that
    // triggers it, not a separate officer click. `resubmitted: true` is
    // what tells the officer "this came back corrected" on their next look.
    if (isCorrection) {
      await this.prisma.participant.update({
        where: { id: participant.id },
        data: { status: 'PENDING', resubmitted: true },
      });

      await this.auditService.log({
        actorUserId: uploaderUserId,
        action: 'participant.resubmitted',
        entityType: 'participant',
        entityId: participant.id,
        metadata: { applicationId, documentType },
      });
    }

    return document;
  }

  /**
   * The other half of upload(): reads a document's bytes back for viewing.
   * Unlike upload — gated to draft/correction windows — a document can be
   * viewed any time by whoever could see it at all: the application's
   * owner, or staff. There's no "is this still editable" question here,
   * only "does this person get to look at it".
   */
  async getFile(
    applicationId: string,
    participantId: string,
    documentId: string,
    requestingUserId: string,
    requestingUserRole: string,
  ): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: { participant: { include: { application: true } } },
    });

    if (
      !document ||
      document.participantId !== participantId ||
      document.participant.applicationId !== applicationId
    ) {
      throw new NotFoundException(
        `No document with id ${documentId} on this participant`,
      );
    }

    const isOwner =
      document.participant.application.applicantUserId === requestingUserId;
    const isStaff =
      requestingUserRole === 'officer' || requestingUserRole === 'admin';
    if (!isOwner && !isStaff) {
      throw new ForbiddenException('This document does not belong to you');
    }

    const buffer = await this.storageService.read(document.storageKey);
    return {
      buffer,
      mimeType: document.mimeType,
      filename: document.originalFilename,
    };
  }
}
