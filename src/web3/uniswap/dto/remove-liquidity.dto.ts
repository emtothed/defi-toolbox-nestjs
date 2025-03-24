import { IsNumber, IsNotEmpty } from 'class-validator';

export class RemoveLiquidityDto {
  @IsNumber()
  @IsNotEmpty()
  tokenId: number;
}