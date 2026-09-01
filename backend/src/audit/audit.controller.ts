import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/types/jwt-payload.type';
import { AuditService, AuditLogEntry } from './audit.service';
import { FindAuditLogQueryDto } from './dto/find-audit-log-query.dto';

@Controller('audit-log')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.officer, UserRole.admin)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  // Officers only get this scoped to one entity (e.g. the activity tab on
  // an application they're reviewing) — browsing the log unscoped, across
  // every actor and entity, is admin-only. See docs/WEEK7_SPEC.md Section 1.
  @Get()
  findMany(
    @Query() query: FindAuditLogQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<AuditLogEntry[]> {
    const isScopedToOneEntity = !!(query.entityType && query.entityId);
    if (!isScopedToOneEntity && user.role !== UserRole.admin) {
      throw new ForbiddenException(
        'Only admins can browse the audit log without scoping it to one entity',
      );
    }

    return this.auditService.findMany({
      entityType: query.entityType,
      entityId: query.entityId,
      actorUserId: query.actorUserId,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
  }
}
