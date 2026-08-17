import { apiRequest } from './client';
import { AppDocument, DocumentType } from './types';

export interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
}

export function uploadDocument(
  applicationId: string,
  participantId: string,
  documentType: DocumentType,
  file: PickedFile,
): Promise<AppDocument> {
  const formData = new FormData();
  formData.append('documentType', documentType);
  // React Native's fetch accepts this {uri, name, type} shape directly in a
  // FormData entry — it isn't a real Blob, but the native bridge knows how
  // to stream the file at `uri` from it.
  formData.append(
    'file',
    { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob,
  );

  return apiRequest(
    `/applications/${applicationId}/participants/${participantId}/documents`,
    { method: 'POST', formData },
  );
}
