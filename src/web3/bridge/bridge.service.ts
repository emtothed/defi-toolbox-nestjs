import { Injectable, BadRequestException } from '@nestjs/common';
import { ethers } from 'ethers';
import { LiFi, RoutesRequest, Route, ExecutionSettings } from '@lifi/sdk';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Network, bridgeConfig, bridgeChains } from './config/bridge.config';
import { WalletService } from '../../auth/wallet.service';
import { User } from '../../auth/entities/user.entity';
import { Transaction } from '../entities/transaction.entity';
import { Protocol, TransactionType } from '../entities/transaction.entity';
import { TokenSymbol, tokens } from '../config/tokens.config';

@Injectable()
export class BridgeService {
  private lifi: LiFi;

  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private walletService: WalletService,
  ) {
    this.lifi = new LiFi({
      integrator: bridgeConfig.integrator,
      apiKey: bridgeConfig.apiKey,
    });
  }

  async getRoute(
    fromChain: Network,
    toChain: Network,
    amountInWei: string,
    tokenAddress: string,
  ) {
    const routesRequest: RoutesRequest = {
      fromChainId: Number(fromChain),
      fromAmount: amountInWei.toString(),
      fromTokenAddress: tokenAddress,
      toChainId: Number(toChain),
      toTokenAddress: tokenAddress,
      options: {
        integrator: bridgeConfig.integrator,
        slippage: bridgeConfig.defaultSlippage,
        order: 'RECOMMENDED',
      },
    };

    const result = await this.lifi.getRoutes(routesRequest);
    if (result.routes.length === 0) {
      throw new BadRequestException('No routes found');
    }

    console.log('Available routes:');
    for (let i = 0; i < result.routes.length; i++) {
      console.log('='.repeat(65));
      console.log(`Route ${i}:`, result.routes[i]);
    }

    return result.routes;
  }

  async executeBridge(route: Route, user: User, apiKey: string) {
    const wallet = await this.walletService.getWalletFromApiKey(apiKey);
    const provider = new ethers.providers.JsonRpcProvider(
      bridgeChains[route.fromChainId].rpcUrl,
    );
    const connectedWallet = wallet.connect(provider);

    const executionSettings: ExecutionSettings = {
      updateRouteHook: (updatedRoute) => {
        console.log(
          `Status updated: ${updatedRoute.steps[0].execution?.status}`,
        );
      },
      acceptExchangeRateUpdateHook: async () => true,
    };

    try {
      const result = await this.lifi.executeRoute(
        connectedWallet,
        route,
        executionSettings,
      );

      const tx = result.steps[0].execution?.process[0]?.txHash;
      if (!tx) {
        throw new BadRequestException('Transaction failed');
      }

      const decimals = route.fromToken.decimals;

      await this.transactionRepository.save({
        transactionHash: tx,
        protocol: Protocol.LIFI,
        type: TransactionType.BRIDGE,
        token: route.fromToken.name,
        amount: ethers.utils.formatUnits(route.fromAmount, decimals),
        isSuccess: true,
        user,
      });

      return {
        transactionHash: tx,
        status: result.steps[0].execution?.status,
        fromChain: bridgeChains[route.fromChainId].name,
        toChain: bridgeChains[route.toChainId].name,
        token: route.fromToken.name,
        amount: ethers.utils.formatUnits(route.fromAmount, decimals),
      };
    } catch (error) {
      console.error('Bridge execution failed:', error);
      throw new BadRequestException(
        `Bridge execution failed: ${error.message}`,
      );
    }
  }
}
