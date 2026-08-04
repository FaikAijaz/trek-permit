import { extname } from 'node:path';
import { Injectable, NotFoundException } from '@nestjs/common';
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
    documentType: DocumentType,
    file: Express.Multer.File,
    uploaderUserId: string,
  ): Promise<Document> {
    const application =
      await this.applicationsService.getEditableOwnApplication(
        applicationId,
        uploaderUserId,
      );

    const leader = application.participants.find((p) => p.isLeader);
    if (!leader) {
      throw new NotFoundException('No leader participant on this application');
    }

    // Never overwrite: find the current document of this type (if any) and
    // supersede it, rather than mutating it in place.
    const existing = await this.prisma.document.findFirst({
      where: { participantId: leader.id, documentType, isCurrent: true },
    });
    const version = existing ? existing.version + 1 : 1;

    const ext = extname(file.originalname).toLowerCase();
    const storageKey = `${leader.id}/${documentType}_v${version}${ext}`;
    await this.storageService.save(storageKey, file.buffer);

    if (existing) {
      await this.prisma.document.update({
        where: { id: existing.id },
        data: { isCurrent: false },
      });
    }

    const document = await this.prisma.document.create({
      data: {
        participantId: leader.id,
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
      metadata: { documentType, version, participantId: leader.id },
    });

    return document;
  }
}
