import {
  Controller,
  Get,
  Query,
  UseGuards,
  Headers,
  Req,
} from '@nestjs/common';
import { Web3UtilsService } from './web3-utils.service';
import { ApiKeyGuard } from '../../auth/guards/api-key.guard';
import { ethers } from 'ethers';
import { User } from '../../auth/entities/user.entity';
import { TransactionHistoryDto } from './dto/transaction-history.dto';

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

  @Get('wallet-address')
  async getWalletAddress(@Headers('x-api-key') apiKey: string) {
    const address = await this.web3UtilsService.getWalletAddress(apiKey);
    return { address };
  }

  @Get('balance')
  async getBalance(
    @Query('tokenAddress') tokenAddress: string = ethers.constants.AddressZero,
    @Headers('x-api-key') apiKey: string,
  ) {
    return await this.web3UtilsService.getBalance(tokenAddress, apiKey);
  }

  @Get('max-possible-amount')
  async getPossibleMaxAmount(@Headers('x-api-key') apiKey: string) {
    return await this.web3UtilsService.getPossibleMaxAmount(apiKey);
  }

  @Get('transactions')
  async getTransactionHistory(
    @Query() filters: TransactionHistoryDto,
    @Req() request: Request & { user: User },
  ) {
    return await this.web3UtilsService.getTransactionHistory(
      request.user,
      filters,
    );
  }
}
