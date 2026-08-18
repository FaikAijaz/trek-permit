import * as ed from '@noble/ed25519';
import { sha512 } from '@noble/hashes/sha2.js';
import { PermitPayload } from '../api/types';
import { getStatus, isRevoked } from './store';

// @noble/ed25519 v3 ships no hash implementation itself (kept dependency-free)
// — this is the one-time wiring the README asks for. Sync verify() is enough
// here; nothing on this screen signs or generates keys.
ed.hashes.sha512 = sha512;

export type VerificationOutcome =
  | 'valid'
  | 'revoked'
  | 'expired'
  | 'not_yet_valid'
  | 'bad_signature'
  | 'malformed'
  | 'no_public_key';

export interface VerificationResult {
  outcome: VerificationOutcome;
  payload: PermitPayload | null;
}

// Hermes doesn't provide atob/btoa (confirmed absent from Expo SDK 57's
// documented globals, unlike TextEncoder which is). Standard base64 has no
// non-ASCII input, so a hand-rolled decoder needs nothing Hermes lacks.
const BASE64_ALPHABET =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64ToBytes(base64: string): Uint8Array {
  const clean = base64.replace(/=+$/, '');
  const bytes: number[] = [];
  let buffer = 0;
  let bitsInBuffer = 0;
  for (const char of clean) {
    const value = BASE64_ALPHABET.indexOf(char);
    if (value === -1) continue; // ignore stray whitespace, etc.
    buffer = (buffer << 6) | value;
    bitsInBuffer += 6;
    if (bitsInBuffer >= 8) {
      bitsInBuffer -= 8;
      bytes.push((buffer >> bitsInBuffer) & 0xff);
    }
  }
  return Uint8Array.from(bytes);
}

/**
 * Runs entirely against the SQLite cache in src/offline/store.ts — no
 * network call, per BUILD_SPEC.md Section 1's defining constraint. Checks
 * are ordered cheapest/most-decisive first: a permit whose signature
 * doesn't even check out shouldn't get as far as a revocation lookup.
 */
export function verifyPermit(qrPayload: string): VerificationResult {
  const { publicKeyHex } = getStatus();
  if (!publicKeyHex) {
    return { outcome: 'no_public_key', payload: null };
  }

  // The signature is base64 and the JSON payload contains no literal '.'
  // (permits.service.ts's payload has no float fields), so the *last* dot
  // unambiguously separates them — see that file's qrPayload construction.
  const dotIndex = qrPayload.lastIndexOf('.');
  if (dotIndex === -1) {
    return { outcome: 'malformed', payload: null };
  }
  const signedPayload = qrPayload.slice(0, dotIndex);
  const signatureBase64 = qrPayload.slice(dotIndex + 1);

  let payload: PermitPayload;
  try {
    payload = JSON.parse(signedPayload) as PermitPayload;
  } catch {
    return { outcome: 'malformed', payload: null };
  }

  let signatureOk: boolean;
  try {
    signatureOk = ed.verify(
      base64ToBytes(signatureBase64),
      new TextEncoder().encode(signedPayload),
      ed.etc.hexToBytes(publicKeyHex),
    );
  } catch {
    return { outcome: 'bad_signature', payload: null };
  }
  if (!signatureOk) {
    return { outcome: 'bad_signature', payload: null };
  }

  if (isRevoked(payload.pid)) {
    return { outcome: 'revoked', payload };
  }

  // f/t are plain date-only strings ("2026-08-10"), so a lexical compare
  // against today's date-only string is a correct chronological compare.
  const today = new Date().toISOString().slice(0, 10);
  if (today < payload.f) {
    return { outcome: 'not_yet_valid', payload };
  }
  if (today > payload.t) {
    return { outcome: 'expired', payload };
  }

  return { outcome: 'valid', payload };
}
