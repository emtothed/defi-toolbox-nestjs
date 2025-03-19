import {
  Controller,
  Post,
  Body,
  UseGuards,
  Headers,
  Req,
} from '@nestjs/common';
import { BridgeService } from './bridge.service';
import { GetRouteDto } from './dto/get-route.dto';
import { ExecuteBridgeDto } from './dto/execute-bridge.dto';
import { ApiKeyGuard } from '../../auth/guards/api-key.guard';
import { User } from '../../auth/entities/user.entity';
import { get } from 'http';

@UseGuards(ApiKeyGuard)
@Controller('web3/bridge')
export class BridgeController {
  constructor(private readonly bridgeService: BridgeService) {}

  @Post('route')
  async getRoute(@Body() getRouteDto: GetRouteDto) {
    return await this.bridgeService.getRoute(
      getRouteDto.fromChain,
      getRouteDto.toChain,
      getRouteDto.amount,
      getRouteDto.tokenAddress,
    );
  }

  @Post('execute')
  async executeBridge(
    @Body() executeBridgeDto: ExecuteBridgeDto,
    @Headers('x-api-key') apiKey: string,
    @Req() request: Request & { user: User },
  ) {
    return await this.bridgeService.executeBridge(
      executeBridgeDto.route,
      request.user,
      apiKey,
    );
  }
}
