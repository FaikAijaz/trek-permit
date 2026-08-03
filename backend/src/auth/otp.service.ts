import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { scrypt as scryptCallback } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

const scrypt = promisify(scryptCallback);
const SCRYPT_KEY_LENGTH = 64;

async function hashCode(code: string): Promise<string> {
  const salt = randomBytes(16);
  const derivedKey = (await scrypt(code, salt, SCRYPT_KEY_LENGTH)) as Buffer;
  return `${salt.toString('hex')}:${derivedKey.toString('hex')}`;
}

async function verifyCode(code: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;

  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  const actual = (await scrypt(code, salt, SCRYPT_KEY_LENGTH)) as Buffer;

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Generates a new OTP, stores its hash, and returns the plaintext code to send. */
  async generate(mobile: string): Promise<string> {
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const codeHash = await hashCode(code);

    const expiryMinutes = this.config.get<number>('OTP_EXPIRY_MINUTES', 10);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60_000);

    await this.prisma.otpCode.create({
      data: { mobile, codeHash, expiresAt },
    });

    return code;
  }

  /** Verifies a code against the most recent unconsumed OTP for this mobile. */
  async verify(mobile: string, code: string): Promise<void> {
    const otp = await this.prisma.otpCode.findFirst({
      where: { mobile, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new BadRequestException(
        'No active code for this number — request a new one',
      );
    }

    if (otp.expiresAt < new Date()) {
      throw new BadRequestException('Code has expired — request a new one');
    }

    const maxAttempts = this.config.get<number>('OTP_MAX_ATTEMPTS', 5);
    if (otp.attempts >= maxAttempts) {
      throw new UnauthorizedException(
        'Too many incorrect attempts — request a new code',
      );
    }

    const isValid = await verifyCode(code, otp.codeHash);

    if (!isValid) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Incorrect code');
    }

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });
  }
}
