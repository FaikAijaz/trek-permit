import * as SQLite from 'expo-sqlite';
import { fetchPublicKey, fetchRevocations } from '../api/verification';

// The Field Officer app's entire reason for existing (BUILD_SPEC.md Section
// 1's defining constraint): what a checkpoint with no signal still has on
// hand to verify a permit against. Populated only by syncNow(), read by
// every other function here.
const db = SQLite.openDatabaseSync('trekpermit-offline.db');

db.execSync(`
  CREATE TABLE IF NOT EXISTS meta (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS revocations (
    reference TEXT PRIMARY KEY NOT NULL,
    revoked_at TEXT NOT NULL
  );
`);

const PUBLIC_KEY_META_KEY = 'publicKeyHex';
const LAST_SYNCED_META_KEY = 'lastSyncedAt';

export interface SyncStatus {
  publicKeyHex: string | null;
  revocationCount: number;
  lastSyncedAt: string | null;
}

function getMeta(key: string): string | null {
  const row = db.getFirstSync<{ value: string }>(
    'SELECT value FROM meta WHERE key = ?',
    key,
  );
  return row?.value ?? null;
}

function setMeta(key: string, value: string): void {
  db.runSync('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', key, value);
}

/** What the Scan and Sync screens read on launch — never touches the network. */
export function getStatus(): SyncStatus {
  const row = db.getFirstSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM revocations',
  );
  return {
    publicKeyHex: getMeta(PUBLIC_KEY_META_KEY),
    revocationCount: row?.count ?? 0,
    lastSyncedAt: getMeta(LAST_SYNCED_META_KEY),
  };
}

export function isRevoked(reference: string): boolean {
  return (
    db.getFirstSync('SELECT 1 FROM revocations WHERE reference = ?', reference) != null
  );
}

/**
 * The one moment the officer side talks to the server — while there's still
 * signal, ahead of walking into checkpoints that won't have any. Replaces
 * the whole revocation list rather than diffing it: the dataset is small
 * (one pilot route, one season) and a full replace can't drift from the
 * server's truth the way an incremental sync could.
 */
export async function syncNow(): Promise<SyncStatus> {
  const [{ publicKeyHex }, revocations] = await Promise.all([
    fetchPublicKey(),
    fetchRevocations(),
  ]);

  db.withTransactionSync(() => {
    db.runSync('DELETE FROM revocations');
    for (const r of revocations) {
      db.runSync(
        'INSERT INTO revocations (reference, revoked_at) VALUES (?, ?)',
        r.reference,
        r.revokedAt,
      );
    }
    setMeta(PUBLIC_KEY_META_KEY, publicKeyHex);
    setMeta(LAST_SYNCED_META_KEY, new Date().toISOString());
  });

  return getStatus();
}
