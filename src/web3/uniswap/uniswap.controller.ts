import {
  Controller,
  Post,
  Body,
  UseGuards,
  Headers,
  Req,
} from '@nestjs/common';
import { UniswapService } from './uniswap.service';
import { SwapDto } from './dto/swap.dto';
import { EthSwapDto } from './dto/eth-swap.dto';
import { ApiKeyGuard } from '../../auth/guards/api-key.guard';
import { User } from '../../auth/entities/user.entity';
import { AddLiquidityDto } from './dto/add-liquidity.dto';
import { LiquidityPoolsService } from './liquidity-pools.service';
import { RemoveLiquidityDto } from './dto/remove-liquidity.dto';

@UseGuards(ApiKeyGuard)
@Controller('web3/uniswap')
export class UniswapController {
  constructor(
    private readonly uniswapService: UniswapService,
    private readonly liquidityPoolsService: LiquidityPoolsService,
  ) {}

  @Post('swap')
  async swap(
    @Body() swapDto: SwapDto,
    @Headers('x-api-key') apiKey: string,
    @Req() request: Request & { user: User },
  ) {
    return await this.uniswapService.swap(
      swapDto.amount,
      swapDto.tokenIn,
      swapDto.tokenOut,
      request.user,
      apiKey,
    );
  }

  @Post('eth-swap')
  async ethSwap(
    @Body() ethSwapDto: EthSwapDto,
    @Headers('x-api-key') apiKey: string,
    @Req() request: Request & { user: User },
  ) {
    return await this.uniswapService.ethSwap(
      ethSwapDto.amount,
      ethSwapDto.tokenOut,
      request.user,
      apiKey,
    );
  }

  @Post('add-liquidity')
  async addLiquidity(
    @Body() addLiquidityDto: AddLiquidityDto,
    @Headers('x-api-key') apiKey: string,
    @Req() request: Request & { user: User },
  ) {
    return await this.liquidityPoolsService.addLiquidity(
      addLiquidityDto.token0,
      addLiquidityDto.token1,
      addLiquidityDto.amount0,
      addLiquidityDto.amount1,
      addLiquidityDto.useFullBalance,
      request.user,
      apiKey,
    );
  }

  @Post('remove-liquidity')
  async removeLiquidity(
    @Body() removeLiquidityDto: RemoveLiquidityDto,
    @Headers('x-api-key') apiKey: string,
    @Req() request: Request & { user: User },
  ) {
    return await this.liquidityPoolsService.removeLiquidity(
      removeLiquidityDto.tokenId,
      request.user,
      apiKey,
    );
  }
}
