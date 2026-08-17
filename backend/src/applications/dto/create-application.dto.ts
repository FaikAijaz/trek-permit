import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsString,
  IsUUID,
  Length,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ApplicationType, GroupType } from '@prisma/client';
import { ParticipantDto } from './participant.dto';

export class CreateApplicationDto {
  @IsUUID()
  trekRouteId!: string;

  @IsEnum(ApplicationType)
  type!: ApplicationType;

  // Required for a group application, forbidden (silently dropped by the
  // service) for an individual one — see BUILD_SPEC.md Section 2, #13.
  @ValidateIf((dto: CreateApplicationDto) => dto.type === 'group')
  @IsEnum(GroupType)
  groupType?: GroupType;

  // Commercial-only fields — see BUILD_SPEC.md Section 2, #14. Verified
  // later by the reviewing officer against departmental records; this
  // validation only confirms the shape, not that the registration is real.
  @ValidateIf(
    (dto: CreateApplicationDto) =>
      dto.type === 'group' && dto.groupType === 'commercial',
  )
  @IsString()
  @Length(1, 100)
  operatorRegistrationNo?: string;

  @ValidateIf(
    (dto: CreateApplicationDto) =>
      dto.type === 'group' && dto.groupType === 'commercial',
  )
  @IsString()
  @Length(1, 200)
  operatorName?: string;

  @ValidateIf(
    (dto: CreateApplicationDto) =>
      dto.type === 'group' && dto.groupType === 'commercial',
  )
  @IsDateString()
  operatorRegValidUntil?: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  // The trek leader's own details. For an individual application this is
  // the only participant; for a group, further members are added afterwards
  // via POST /applications/:id/participants.
  @ValidateNested()
  @Type(() => ParticipantDto)
  leader!: ParticipantDto;
}
