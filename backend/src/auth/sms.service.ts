import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly config: ConfigService) {}

  sendOtp(mobile: string, code: string): void {
    const provider = this.config.get<string>('SMS_PROVIDER', 'console');

    switch (provider) {
      case 'console':
        this.logger.log(`OTP for ${mobile}: ${code}`);
        return;
      case 'msg91':
      case 'twilio':
        throw new Error(
          `SMS_PROVIDER=${provider} is not implemented yet — pilot runs on 'console' only`,
        );
      default:
        throw new Error(`Unknown SMS_PROVIDER: ${provider}`);
    }
  }
}
