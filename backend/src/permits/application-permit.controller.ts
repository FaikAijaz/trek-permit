import {
  Body,
  Controller,
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
import { IssuePermitDto } from './dto/issue-permit.dto';

// Nested under applications/ — same pattern DocumentsController already
// uses to own a route under a URL space it doesn't otherwise control.
// "Issue Permit" (BUILD_SPEC.md Section 2, #1) reads as an application
// action to whoever's calling it, even though the resource it creates
// lives in the permits table.
@Controller('applications/:applicationId/permit')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.officer, UserRole.admin)
export class ApplicationPermitController {
  constructor(private readonly permitsService: PermitsService) {}

  @Post()
  issue(
    @Param('applicationId', ParseUUIDPipe) applicationId: string,
    @Body() dto: IssuePermitDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Permit> {
    return this.permitsService.issue(applicationId, dto, user.sub);
  }
}
