import { IsBoolean, IsOptional } from 'class-validator';

export class IssuePermitDto {
  // Confirms the officer has seen the "some participants are still
  // unresolved" warning and wants to proceed anyway — BUILD_SPEC.md
  // Section 2, #5. Omitted or false on the first attempt.
  @IsOptional()
  @IsBoolean()
  confirmExclusions?: boolean;
}
