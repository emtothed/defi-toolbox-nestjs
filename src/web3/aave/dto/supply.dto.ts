import { IsString, IsEnum, IsNotEmpty } from 'class-validator';
import { TokenSymbol } from '../../config/tokens.config';

export class SupplyDto {
  @IsString()
  @IsNotEmpty()
  amount: string;

  @IsEnum(TokenSymbol)
  @IsNotEmpty()
  token: TokenSymbol;
}
