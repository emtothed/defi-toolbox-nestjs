import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { TokenSymbol } from '../../config/tokens.config';

export class AddLiquidityDto {
  @IsNotEmpty()
  token0: TokenSymbol;

  @IsNotEmpty()
  token1: TokenSymbol;

  @IsString()
  @IsOptional()
  amount0?: string;

  @IsString()
  @IsOptional()
  amount1?: string;

  @IsOptional()
  useFullBalance?: boolean = false;
}
