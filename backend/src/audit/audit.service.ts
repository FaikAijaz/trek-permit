import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface AuditEntry {
  actorUserId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
}

export interface AuditLogFilter {
  entityType?: string;
  entityId?: string;
  actorUserId?: string;
  from?: Date;
  to?: Date;
}

// The actor is nullable on the row itself (system-initiated entries could
// theoretically have no actor), and a deactivated user still keeps their
// name — no soft-delete anywhere strips it.
const AUDIT_LOG_ACTOR_SELECT = {
  id: true,
  fullName: true,
  mobile: true,
  role: true,
} satisfies Prisma.UserSelect;

export type AuditLogEntry = Prisma.AuditLogGetPayload<{
  include: { actor: { select: typeof AUDIT_LOG_ACTOR_SELECT } };
}>;

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditEntry): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorUserId: entry.actorUserId ?? null,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId,
        metadata: entry.metadata,
        ipAddress: entry.ipAddress ?? null,
      },
    });
  }

  async findMany(filter: AuditLogFilter): Promise<AuditLogEntry[]> {
    return this.prisma.auditLog.findMany({
      where: {
        entityType: filter.entityType,
        entityId: filter.entityId,
        actorUserId: filter.actorUserId,
        createdAt:
          filter.from || filter.to
            ? { gte: filter.from, lte: filter.to }
            : undefined,
      },
      include: { actor: { select: AUDIT_LOG_ACTOR_SELECT } },
      orderBy: { createdAt: 'desc' },
      // No pagination exists anywhere else in this API (applications,
      // routes, etc. all just return the full list) — a hard cap here
      // instead, since this is the one query in the app that can be run
      // fully unscoped by an admin over an unbounded table.
      take: 200,
    });
  }
}
