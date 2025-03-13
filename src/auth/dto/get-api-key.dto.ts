import { IsEmail, IsString } from 'class-validator';

export class GetApiKeyDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}
