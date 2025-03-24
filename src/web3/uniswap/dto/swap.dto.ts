import { IsEnum, IsString, IsNotEmpty } from 'class-validator';
import { TokenSymbol } from '../../config/tokens.config';

export class SwapDto {
  @IsString()
  @IsNotEmpty()
  amount: string;

  @IsEnum(TokenSymbol)
  @IsNotEmpty()
  tokenIn: TokenSymbol;

  @IsEnum(TokenSymbol)
  @IsNotEmpty()
  tokenOut: TokenSymbol;
}
