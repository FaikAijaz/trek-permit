import { IsEnum, IsOptional } from 'class-validator';
import { ApplicationStatus } from '@prisma/client';

export class FindApplicationsQueryDto {
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;
}
