import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { JwtPayload } from '../common/types/jwt-payload.type';
import { OtpService } from './otp.service';
import { SmsService } from './sms.service';

export interface AuthResult {
  accessToken: string;
  user: {
    id: string;
    mobile: string;
    fullName: string | null;
    role: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly otpService: OtpService,
    private readonly smsService: SmsService,
    private readonly jwtService: JwtService,
    private readonly auditService: AuditService,
  ) {}

  async requestOtp(mobile: string): Promise<void> {
    const code = await this.otpService.generate(mobile);
    this.smsService.sendOtp(mobile, code);
  }

  async verifyOtp(mobile: string, code: string): Promise<AuthResult> {
    await this.otpService.verify(mobile, code);

    let user = await this.prisma.user.findUnique({ where: { mobile } });
    let isNewUser = false;

    if (!user) {
      user = await this.prisma.user.create({
        data: { mobile, role: 'trekker' },
      });
      isNewUser = true;
    }

    if (!user.isActive) {
      throw new UnauthorizedException('This account has been deactivated');
    }

    if (isNewUser) {
      await this.auditService.log({
        actorUserId: user.id,
        action: 'user.created',
        entityType: 'user',
        entityId: user.id,
        metadata: { mobile: user.mobile, role: user.role },
      });
    }

    const payload: JwtPayload = {
      sub: user.id,
      mobile: user.mobile,
      role: user.role,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        mobile: user.mobile,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }
}
