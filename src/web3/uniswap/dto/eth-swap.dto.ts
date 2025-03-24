import { IsString, IsNotEmpty } from 'class-validator';
import { TokenSymbol } from '../../config/tokens.config';

export class EthSwapDto {
  @IsString()
  @IsNotEmpty()
  amount: string;

  @IsNotEmpty()
  tokenOut: TokenSymbol;
}