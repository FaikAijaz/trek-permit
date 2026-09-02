import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApplicationStatus } from '@prisma/client';

export class FindApplicationsQueryDto {
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  // Matches the application's reference, or the applicant's name/mobile —
  // see ApplicationsService.buildWhere()'s OR clause.
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  trekRouteId?: string;

  // Filters on startDate.
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
