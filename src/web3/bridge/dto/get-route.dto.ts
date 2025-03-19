import { IsEnum, IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { Network } from '../config/bridge.config';
import { TokenSymbol } from '../../config/tokens.config';

export class GetRouteDto {
  @IsEnum(Network)
  @IsNotEmpty()
  fromChain: Network;

  @IsEnum(Network)
  @IsNotEmpty()
  toChain: Network;

  @IsString()
  @IsNotEmpty()
  amount: string;

  @IsEnum(TokenSymbol)
  @IsOptional()
  tokenAddress?: string = '0x0000000000000000000000000000000000000000';
}
