import { Module } from '@nestjs/common';
import { ApplicationPermitController } from './application-permit.controller';
import { PermitsController } from './permits.controller';
import { PermitsService } from './permits.service';
import { SigningService } from './signing.service';

@Module({
  controllers: [PermitsController, ApplicationPermitController],
  providers: [PermitsService, SigningService],
})
export class PermitsModule {}
