import {
  Body,
  Controller,
  Get,
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

  @Patch(':id/participant')
  updateParticipant(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateParticipantDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<Participant> {
    return this.applicationsService.updateParticipant(id, dto, user.sub);
  }

  @Post(':id/submit')
  submit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<Application> {
    return this.applicationsService.submit(id, user.sub);
  }
}
