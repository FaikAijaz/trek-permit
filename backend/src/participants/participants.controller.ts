import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { Participant, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/types/jwt-payload.type';
import { ParticipantsService } from './participants.service';
import { DecideParticipantDto } from './dto/decide-participant.dto';

// Every route here is the officer's, not the applicant's — a trekker
// manages their own participants through /applications instead.
@Controller('participants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.officer, UserRole.admin)
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.participantsService.findForReview(id);
  }

  @Patch(':id/decision')
  decide(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecideParticipantDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Participant> {
    return this.participantsService.decide(id, dto, user.sub);
  }
}
