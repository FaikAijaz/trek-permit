import { IsNumberString, Length, Matches } from 'class-validator';

export class VerifyOtpDto {
  @Matches(/^[0-9]{10,15}$/, {
    message: 'mobile must be 10 to 15 digits, no spaces or country code prefix',
  })
  mobile!: string;

  @IsNumberString()
  @Length(6, 6, { message: 'code must be exactly 6 digits' })
  code!: string;
}
