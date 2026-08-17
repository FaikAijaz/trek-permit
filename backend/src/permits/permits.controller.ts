import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Permit, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/types/jwt-payload.type';
import { PermitsService } from './permits.service';
import { RevokePermitDto } from './dto/revoke-permit.dto';

@Controller('permits')
@UseGuards(JwtAuthGuard)
export class PermitsController {
  constructor(private readonly permitsService: PermitsService) {}

  // Owner (the applicant this permit was issued to) or staff — same
  // ownership rule used everywhere else in the codebase.
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<Permit> {
    return this.permitsService.findOneForUser(id, user.sub, user.role);
  }

  // Admin-only, not officer-and-admin — see permits.service.ts.
  @Post(':id/revoke')
  @UseGuards(RolesGuard)
  @Roles(UserRole.admin)
  revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RevokePermitDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.permitsService.revoke(id, dto, user.sub);
  }
}
