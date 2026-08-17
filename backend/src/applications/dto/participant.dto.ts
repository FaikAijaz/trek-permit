import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateIf,
} from 'class-validator';
import { Gender } from '@prisma/client';

/**
 * The personal details of one person on an application — the trek leader or
 * a group member. Both use the same shape (see BUILD_SPEC.md Section 4:
 * "why one table instead of trek_leaders + group_members") so this DTO is
 * shared rather than duplicated per role.
 */
export class ParticipantDto {
  @IsString()
  @Length(1, 200)
  fullName!: string;

  // Aadhaar is always exactly 12 digits. The column is varchar(20) to leave
  // room for other identity document types later, but this endpoint only
  // ever collects Aadhaar today, so we validate to the real format.
  @Matches(/^\d{12}$/, {
    message: 'identityNumber must be a 12-digit Aadhaar number',
  })
  identityNumber!: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @Matches(/^[0-9]{10,15}$/)
  mobile?: string;

  @IsOptional()
  @IsString()
  @Length(1, 200)
  emergencyContactName?: string;

  @IsOptional()
  @Matches(/^[0-9]{10,15}$/)
  emergencyContactMobile?: string;

  @IsOptional()
  @IsBoolean()
  medicalDeclaration?: boolean;

  @IsOptional()
  @IsBoolean()
  isGuide?: boolean;

  // Only meaningful when isGuide is true — enforced here rather than left to
  // the officer to notice, since a guide without a registration number isn't
  // a decidable case, it's an incomplete one.
  @ValidateIf((dto: ParticipantDto) => dto.isGuide === true)
  @IsString()
  @Length(1, 100)
  guideRegistrationNo?: string;
}
