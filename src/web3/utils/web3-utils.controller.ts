import { Controller, Get, UseGuards } from '@nestjs/common';
import { Web3UtilsService } from './web3-utils.service';
import { ApiKeyGuard } from '../../auth/guards/api-key.guard';

@UseGuards(ApiKeyGuard)
@Controller('web3/utils')
export class Web3UtilsController {
  constructor(private readonly web3UtilsService: Web3UtilsService) {}

  @Get('gas-price')
  async getGasPrice() {
    return await this.web3UtilsService.getNetworkGasPrice();
  }

  @Get('eth-price')
  async getEthPrice() {
    return {
      price: await this.web3UtilsService.getEthPrice(),
    };
  }
}
