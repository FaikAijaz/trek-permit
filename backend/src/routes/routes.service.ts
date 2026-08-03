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
}
