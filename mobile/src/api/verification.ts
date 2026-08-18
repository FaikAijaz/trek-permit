import { apiRequest } from './client';

// Hit only while online, from the Sync screen — see src/offline/store.ts for
// where the results end up (the SQLite cache a scan is actually verified
// against).
export function fetchPublicKey(): Promise<{ publicKeyHex: string }> {
  return apiRequest('/permits/public-key');
}

export function fetchRevocations(): Promise<
  { reference: string; revokedAt: string }[]
> {
  return apiRequest('/permits/revocations');
}
