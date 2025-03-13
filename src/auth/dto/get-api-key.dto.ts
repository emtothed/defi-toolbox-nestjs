import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class GetApiKeyDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
