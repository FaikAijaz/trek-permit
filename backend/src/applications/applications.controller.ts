import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Application, Participant } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/types/jwt-payload.type';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ParticipantDto } from './dto/participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';

@Controller('applications')
@UseGuards(JwtAuthGuard)
export class ApplicationsController {
  constructor(private readonly applicationsService: ApplicationsService) {}

  @Post()
  create(
    @Body() dto: CreateApplicationDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Application> {
    return this.applicationsService.create(dto, user.sub);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload): Promise<Application[]> {
    return this.applicationsService.findAllForUser(user.sub);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<Application> {
    return this.applicationsService.findOneForUser(id, user.sub, user.role);
  }

  // Group members only — an individual application's sole participant is
  // created inline by POST /applications.
  @Post(':id/participants')
  addParticipant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ParticipantDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Participant> {
    return this.applicationsService.addParticipant(id, dto, user.sub);
  }

  @Patch(':id/participants/:participantId')
  updateParticipant(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('participantId', ParseUUIDPipe) participantId: string,
    @Body() dto: UpdateParticipantDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Participant> {
    return this.applicationsService.updateParticipant(
      id,
      participantId,
      dto,
      user.sub,
    );
  }

  @Delete(':id/participants/:participantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeParticipant(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('participantId', ParseUUIDPipe) participantId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.applicationsService.removeParticipant(
      id,
      participantId,
      user.sub,
    );
  }

  @Post(':id/submit')
  submit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<Application> {
    return this.applicationsService.submit(id, user.sub);
  }
}
