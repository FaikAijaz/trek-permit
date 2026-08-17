import { IsString, Length } from 'class-validator';

export class RevokePermitDto {
  @IsString()
  @Length(1, 2000)
  reason!: string;
}
