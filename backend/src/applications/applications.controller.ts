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
  Query,
  UseGuards,
} from '@nestjs/common';
import { Application, Participant, UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/types/jwt-payload.type';
import { ApplicationsService } from './applications.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { FindApplicationsQueryDto } from './dto/find-applications-query.dto';
import { ParticipantDto } from './dto/participant.dto';
import { RejectApplicationDto } from './dto/reject-application.dto';
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

  // Officers/admins see every application (their review queue); a trekker
  // only ever sees their own.
  @Get()
  findAll(
    @Query() query: FindApplicationsQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Application[]> {
    const isStaff = user.role === 'officer' || user.role === 'admin';
    return isStaff
      ? this.applicationsService.findAllForReview(query.status)
      : this.applicationsService.findAllForUser(user.sub, query.status);
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

  // JwtAuthGuard already applies at the class level; RolesGuard here just
  // adds the extra "and must be staff" check on top, in that order.
  @Post(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.officer, UserRole.admin)
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<Application> {
    return this.applicationsService.approve(id, user.sub);
  }

  @Post(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.officer, UserRole.admin)
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectApplicationDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Application> {
    return this.applicationsService.reject(id, dto.reason, user.sub);
  }
}
