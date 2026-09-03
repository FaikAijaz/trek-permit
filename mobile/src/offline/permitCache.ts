import * as SQLite from 'expo-sqlite';
import { Permit } from '../api/types';

// A trekker's own permit, cached for offline display — separate from
// store.ts's trekpermit-offline.db, which is the Field Officer role's
// verification cache (public key + revocation list). Different role,
// different concern: this exists so a trekker with no signal at a
// checkpoint can still show their permit at all, closing the one gap in
// an otherwise fully-offline verification chain (BUILD_SPEC.md Section 1;
// see also the architecture doc's Stage D, "cached locally for fully
// offline access").
const db = SQLite.openDatabaseSync('trekpermit-permit-cache.db');

db.execSync(`
  CREATE TABLE IF NOT EXISTS cached_permits (
    id TEXT PRIMARY KEY NOT NULL,
    reference TEXT NOT NULL,
    qr_payload TEXT NOT NULL,
    valid_from TEXT NOT NULL,
    valid_until TEXT NOT NULL,
    status TEXT NOT NULL,
    cached_at TEXT NOT NULL
  );
`);

export interface CachedPermit extends Permit {
  /** When this copy was last confirmed against the server — shown to the
   * trekker so a stale offline view is never presented as current truth
   * (the architecture doc's Section 6.1: the trekker's own device is
   * never the sole authority on validity). */
  cachedAt: string;
}

interface CachedPermitRow {
  id: string;
  reference: string;
  qr_payload: string;
  valid_from: string;
  valid_until: string;
  status: string;
  cached_at: string;
}

export function getCachedPermit(id: string): CachedPermit | null {
  const row = db.getFirstSync<CachedPermitRow>(
    'SELECT * FROM cached_permits WHERE id = ?',
    id,
  );
  if (!row) return null;
  return {
    id: row.id,
    reference: row.reference,
    qrPayload: row.qr_payload,
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    status: row.status as Permit['status'],
    cachedAt: row.cached_at,
  };
}

/** Called every time a live fetch succeeds — always overwrites with the
 * server's current copy, including its status (so a revocation that
 * happened since the last cache write is picked up the moment the
 * trekker's device has signal again). */
export function cachePermit(permit: Permit): void {
  db.runSync(
    `INSERT OR REPLACE INTO cached_permits
       (id, reference, qr_payload, valid_from, valid_until, status, cached_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    permit.id,
    permit.reference,
    permit.qrPayload,
    permit.validFrom,
    permit.validUntil,
    permit.status,
    new Date().toISOString(),
  );
}
