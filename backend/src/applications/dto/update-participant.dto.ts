import { PartialType } from '@nestjs/mapped-types';
import { ApplicantDto } from './applicant.dto';

export class UpdateParticipantDto extends PartialType(ApplicantDto) {}
