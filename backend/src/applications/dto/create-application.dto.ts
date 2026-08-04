import { Type } from 'class-transformer';
import { IsDateString, IsUUID, ValidateNested } from 'class-validator';
import { ApplicantDto } from './applicant.dto';

export class CreateApplicationDto {
  @IsUUID()
  trekRouteId!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @ValidateNested()
  @Type(() => ApplicantDto)
  applicant!: ApplicantDto;
}
