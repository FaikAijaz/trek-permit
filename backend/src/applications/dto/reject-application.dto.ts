import { IsString, Length } from 'class-validator';

export class RejectApplicationDto {
  // Application-level rejection reasons — route closed, dates unavailable,
  // invalid/expired operator registration (BUILD_SPEC.md Section 2, #3).
  // Free text rather than an enum: the officer's real-world reason doesn't
  // always fit a fixed list, and the leader needs to actually read why.
  @IsString()
  @Length(1, 2000)
  reason!: string;
}
