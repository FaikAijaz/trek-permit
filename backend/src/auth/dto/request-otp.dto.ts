import { Matches } from 'class-validator';

export class RequestOtpDto {
  @Matches(/^[0-9]{10,15}$/, {
    message: 'mobile must be 10 to 15 digits, no spaces or country code prefix',
  })
  mobile!: string;
}
