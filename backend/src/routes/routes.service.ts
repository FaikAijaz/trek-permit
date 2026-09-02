import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TrekRoute } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';

// findVisitors()'s shape — one row per participant actually going, not the
// full Participant record (an officer at a trailhead needs a roster, not
// every field collected at application time).
export interface VisitorListItem {
  participantId: string;
  fullName: string;
  identityLast4: string;
  isLeader: boolean;
  isGuide: boolean;
  mobile: string | null;
  applicationReference: string;
  permitStatus: 'active' | 'revoked' | null;
}

@Injectable()
export class RoutesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async findAll(isOpen?: boolean): Promise<TrekRoute[]> {
    return this.prisma.trekRoute.findMany({
      where: isOpen === undefined ? undefined : { isOpen },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string): Promise<TrekRoute> {
    const route = await this.prisma.trekRoute.findUnique({ where: { id } });
    if (!route) {
      throw new NotFoundException(`No trek route with id ${id}`);
    }
    return route;
  }

  async create(dto: CreateRouteDto, actorUserId: string): Promise<TrekRoute> {
    const route = await this.prisma.trekRoute.create({
      data: {
        ...dto,
        requiredDocuments: dto.requiredDocuments ?? [],
      },
    });

    await this.auditService.log({
      actorUserId,
      action: 'route.created',
      entityType: 'trek_route',
      entityId: route.id,
      metadata: { name: route.name },
    });

    return route;
  }

  async update(
    id: string,
    dto: UpdateRouteDto,
    actorUserId: string,
  ): Promise<TrekRoute> {
    await this.findOne(id); // 404s cleanly if it doesn't exist

    const route = await this.prisma.trekRoute.update({
      where: { id },
      data: dto,
    });

    await this.auditService.log({
      actorUserId,
      action: 'route.updated',
      entityType: 'trek_route',
      entityId: route.id,
      metadata: { fields: Object.keys(dto) },
    });

    return route;
  }

  async remove(id: string, actorUserId: string): Promise<void> {
    await this.findOne(id);

    try {
      await this.prisma.trekRoute.delete({ where: { id } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Cannot delete a route that already has applications against it',
        );
      }
      throw error;
    }

    await this.auditService.log({
      actorUserId,
      action: 'route.deleted',
      entityType: 'trek_route',
      entityId: id,
    });
  }

  /** Who's actually on this route on a given date — an approved
   * participant, on an application that's cleared review, whose date
   * span covers that date. Read-only: no check-in/check-out, that's
   * explicitly out of scope for the pilot (BUILD_SPEC.md Section 2, #18). */
  async findVisitors(routeId: string, date: Date): Promise<VisitorListItem[]> {
    await this.findOne(routeId); // 404s cleanly if the route doesn't exist

    const participants = await this.prisma.participant.findMany({
      where: {
        status: 'APPROVED',
        application: {
          trekRouteId: routeId,
          status: { in: ['approved', 'permit_issued'] },
          startDate: { lte: date },
          endDate: { gte: date },
        },
      },
      include: {
        application: {
          select: {
            reference: true,
            permits: {
              select: { status: true },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      // Leader first, then alphabetical — a printed/glanced-at roster
      // reads better with the person in charge at the top.
      orderBy: [{ isLeader: 'desc' }, { fullName: 'asc' }],
    });

    return participants.map((p) => ({
      participantId: p.id,
      fullName: p.fullName,
      identityLast4: p.identityLast4,
      isLeader: p.isLeader,
      isGuide: p.isGuide,
      mobile: p.mobile,
      applicationReference: p.application.reference,
      permitStatus: p.application.permits[0]?.status ?? null,
    }));
  }
}
