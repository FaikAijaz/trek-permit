import { IsDateString } from 'class-validator';

// A single date, not a from/to range — see docs/WEEK7_SPEC.md Section 3:
// an application's date span rarely runs more than a few days, so picking
// one date at a time is simpler and sufficient for a route+date roster.
export class FindVisitorsQueryDto {
  @IsDateString()
  date!: string;
}
