import { IsEnum } from 'class-validator';
import { TokenSymbol } from '../../config/tokens.config';

export class WithdrawDto {
  @IsEnum(TokenSymbol)
  token: TokenSymbol;
}
