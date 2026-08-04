import { IsEnum } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class UploadDocumentDto {
  @IsEnum(DocumentType)
  documentType!: DocumentType;
}
