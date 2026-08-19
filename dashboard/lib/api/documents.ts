import { apiRequestBlob } from './client';

export function fetchDocumentBlob(
  applicationId: string,
  participantId: string,
  documentId: string,
): Promise<Blob> {
  return apiRequestBlob(
    `/applications/${applicationId}/participants/${participantId}/documents/${documentId}`,
  );
}
