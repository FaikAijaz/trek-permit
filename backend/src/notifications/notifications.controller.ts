import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { Notification } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/types/jwt-payload.type';
import { NotificationsService } from './notifications.service';

// No @Roles() here — every role (trekker, officer, admin) reads only
// their own inbox, scoped by the JWT's subject, not by what they're
// allowed to do elsewhere in the app.
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findMine(@CurrentUser() user: JwtPayload): Promise<Notification[]> {
    return this.notificationsService.findMineForUser(user.sub);
  }

  @Patch(':id/read')
  markRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<Notification> {
    return this.notificationsService.markRead(id, user.sub);
  }

  @Patch('read-all')
  async markAllRead(@CurrentUser() user: JwtPayload): Promise<{ ok: true }> {
    await this.notificationsService.markAllRead(user.sub);
    return { ok: true };
  }
}
