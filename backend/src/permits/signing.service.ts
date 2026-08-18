import {
  KeyObject,
  createPrivateKey,
  createPublicKey,
  sign as cryptoSign,
  verify as cryptoVerify,
} from 'node:crypto';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Ed25519 signing for permits. BUILD_SPEC.md Section 6 suggests
 * @noble/ed25519 or tweetnacl — this uses Node's own built-in Ed25519
 * support instead (available since Node 12), the same `node:crypto` module
 * otp.service.ts already relies on. Same algorithm, zero extra dependency.
 */
@Injectable()
export class SigningService implements OnModuleInit {
  private privateKey!: KeyObject;
  private publicKey!: KeyObject;

  constructor(private readonly config: ConfigService) {}

  onModuleInit(): void {
    const privateKeyB64 = this.config.get<string>('SIGNING_PRIVATE_KEY');
    const publicKeyB64 = this.config.get<string>('SIGNING_PUBLIC_KEY');

    if (!privateKeyB64 || !publicKeyB64) {
      // A permit system that can't sign shouldn't start at all — better a
      // loud boot failure than a silent one discovered at issuance time.
      throw new Error(
        'SIGNING_PRIVATE_KEY / SIGNING_PUBLIC_KEY must be set — see .env.example',
      );
    }

    this.privateKey = createPrivateKey({
      key: Buffer.from(privateKeyB64, 'base64'),
      format: 'der',
      type: 'pkcs8',
    });
    this.publicKey = createPublicKey({
      key: Buffer.from(publicKeyB64, 'base64'),
      format: 'der',
      type: 'spki',
    });
  }

  /** Signs a UTF-8 string, returning a base64 Ed25519 signature. */
  sign(data: string): string {
    // Ed25519 signs the message directly — passing `null` as the algorithm
    // is correct here (not a missing hash), unlike RSA/ECDSA.
    return cryptoSign(
      null,
      Buffer.from(data, 'utf8'),
      this.privateKey,
    ).toString('base64');
  }

  /** Verifies a base64 signature against the string it should cover. */
  verify(data: string, signatureBase64: string): boolean {
    return cryptoVerify(
      null,
      Buffer.from(data, 'utf8'),
      this.publicKey,
      Buffer.from(signatureBase64, 'base64'),
    );
  }

  /**
   * The raw 32-byte Ed25519 public key as hex — what an offline verifier
   * (the Field Officer app, via @noble/ed25519) actually needs. The stored
   * SIGNING_PUBLIC_KEY is DER/SPKI-wrapped (right for Node's own KeyObject
   * import), which isn't the same bytes a non-Node Ed25519 library expects.
   * Exporting as JWK sidesteps hand-parsing that DER structure — JWK's `x`
   * field for an OKP/Ed25519 key *is* the raw public key, base64url-encoded.
   */
  getPublicKeyHex(): string {
    const jwk = this.publicKey.export({ format: 'jwk' }) as { x: string };
    return Buffer.from(jwk.x, 'base64url').toString('hex');
  }
}
