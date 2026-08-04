import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { Gender } from '@prisma/client';

export class ApplicantDto {
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
}
