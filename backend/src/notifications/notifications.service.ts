import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Notification, NotificationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface NotificationEntry {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType: string;
  entityId: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Called alongside (not instead of) AuditService.log() at the subset of
   * call sites that represent something a trekker/trek leader would want
   * to know about — see docs/WEEK7_SPEC.md Section 4 for which. */
  async create(entry: NotificationEntry): Promise<void> {
    await this.prisma.notification.create({ data: entry });
  }

  async findMineForUser(userId: string): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      // No pagination anywhere else in this API either — a hard cap
      // instead, same reasoning as AuditService.findMany(). The client
      // derives the unread count from this same list rather than a
      // separate count endpoint.
      take: 100,
    });
  }

  async markRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!notification) {
      throw new NotFoundException(`No notification with id ${id}`);
    }
    if (notification.userId !== userId) {
      throw new ForbiddenException(
        "Can't mark another user's notification as read",
      );
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
