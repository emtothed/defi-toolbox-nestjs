import { Injectable, BadRequestException } from '@nestjs/common';
import { ethers } from 'ethers';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { Transaction } from '../entities/transaction.entity';
import { Protocol, TransactionType } from '../entities/transaction.entity';
import { WalletService } from '../../auth/wallet.service';
import { TokenSymbol, tokens } from '../config/tokens.config';
import { uniswapConfig } from './config/uniswap.config';
import { Web3UtilsService } from '../utils/web3-utils.service';
import SwapRouterABI from './ABI/swapRouterV2Sepolia.abi.json';
import erc20Abi from './ABI/ERC20.abi.json';
import { chains } from '../config/chains.config';

@Injectable()
export class UniswapService {
  private provider: ethers.providers.JsonRpcProvider;
  private chainId: number;

  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private configService: ConfigService,
    private walletService: WalletService,
    private web3UtilsService: Web3UtilsService,
  ) {
    this.chainId = this.configService.get<number>('CHAIN_ID') || 11155111;
    this.provider = new ethers.providers.JsonRpcProvider(
      chains[this.chainId].rpcUrl,
    );
  }

  async swap(
    amount: string,
    tokenInSymbol: TokenSymbol,
    tokenOutSymbol: TokenSymbol,
    user: User,
    apiKey: string,
  ) {
    const wallet = await this.walletService.getWalletFromApiKey(apiKey);
    const connectedWallet = wallet.connect(this.provider);

    const tokenIn = tokens[tokenInSymbol];
    const tokenOut = tokens[tokenOutSymbol];

    const tokenInContract = new ethers.Contract(
      tokenIn.address[this.chainId],
      erc20Abi,
      connectedWallet,
    );

    const amountIn = ethers.utils.parseUnits(amount, tokenIn.decimals);
    const tokenInBalance = await tokenInContract.balanceOf(wallet.address);

    if (tokenInBalance.lt(amountIn)) {
      throw new BadRequestException('Not enough balance for token in');
    }

    const swapRouter = new ethers.Contract(
      uniswapConfig.swapRouterAddress,
      SwapRouterABI,
      connectedWallet,
    );

    // Approve function with retry logic
    const approve = async (attempt: number) => {
      try {
        const approveTx = await tokenInContract.approve(
          uniswapConfig.swapRouterAddress,
          ethers.constants.MaxUint256,
          {
            gasPrice: (await this.provider.getGasPrice()).mul(105).div(100),
          },
        );
        const approveReceipt = await approveTx.wait();
        return approveReceipt;
      } catch (error) {
        if (attempt < 3) {
          return await approve(attempt + 1);
        }
        throw error;
      }
    };

    const allowance = await tokenInContract.allowance(
      wallet.address,
      uniswapConfig.swapRouterAddress,
    );

    if (allowance.lt(amountIn)) {
      await approve(1);
    }
    console.log('==== Check 1 ====');
    const params = {
      tokenIn: tokenIn.address[this.chainId],
      tokenOut: tokenOut.address[this.chainId],
      fee: uniswapConfig.defaultFee,
      recipient: wallet.address,
      deadline: Math.floor(Date.now() / 1000 + uniswapConfig.approvalTimeout),
      amountIn: amountIn,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0,
    };

    const swap = async (attempt: number) => {
      try {
        const tx = await swapRouter.exactInputSingle(params, {
          gasPrice: (await this.provider.getGasPrice()).mul(105).div(100),
        });
        const receipt = await tx.wait();
        return { tx, receipt };
      } catch (error) {
        if (attempt < 3) {
          return await swap(attempt + 1);
        }
        throw error;
      }
    };

    const { tx, receipt } = await swap(1);
    console.log('==== Check 2 ====');

    const logs = receipt.events.filter(
      (e: any) => e.address === tokenOut.address[this.chainId],
    );
    const amountOut = ethers.BigNumber.from(logs[0].data);

    const formattedAmountIn = ethers.utils.formatUnits(
      amountIn,
      tokenIn.decimals,
    );
    const formattedAmountOut = ethers.utils.formatUnits(
      amountOut,
      tokenOut.decimals,
    );

    // const usdAmountIn = await this.web3UtilsService.getUsdPrice(
    //   tokenIn.address[this.chainId],
    //   Number(formattedAmountIn),
    // );
    // const usdAmountOut = await this.web3UtilsService.getUsdPrice(
    //   tokenOut.address[this.chainId],
    //   Number(formattedAmountOut),
    // );

    await this.transactionRepository.save({
      transactionHash: tx.hash,
      protocol: Protocol.UNISWAP,
      type: TransactionType.SWAP,
      token: `${tokenIn.symbol}-${tokenOut.symbol}`,
      amount: formattedAmountIn,
      isSuccess: true,
      user,
    });

    return {
      transactionHash: tx.hash,
      action: 'Swap',
      protocol: 'uniswap',
      tokenIn: tokenIn.symbol,
      amountIn: formattedAmountIn,
      tokenOut: tokenOut.symbol,
      amountOut: formattedAmountOut,
    };
  }

  async ethSwap(
    amount: string,
    tokenOutSymbol: TokenSymbol,
    user: User,
    apiKey: string,
  ) {
    const wallet = await this.walletService.getWalletFromApiKey(apiKey);
    const connectedWallet = wallet.connect(this.provider);

    const amountIn = ethers.utils.parseEther(amount);
    const formattedAmount = ethers.utils.formatEther(amountIn);

    const tokenOut = tokens[tokenOutSymbol];
    const tokenContract = new ethers.Contract(
      tokenOut.address[this.chainId],
      erc20Abi,
      connectedWallet,
    );

    const swapRouter = new ethers.Contract(
      uniswapConfig.swapRouterAddress,
      SwapRouterABI,
      connectedWallet,
    );

    const params = {
      tokenIn: tokens.WETH.address[this.chainId],
      tokenOut: tokenOut.address[this.chainId],
      fee: uniswapConfig.defaultFee,
      recipient: wallet.address,
      deadline: Math.floor(Date.now() / 1000 + uniswapConfig.approvalTimeout),
      amountIn,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0,
    };

    const swap = async (attempt: number) => {
      try {
        console.log('='.repeat(65));
        const tx = await swapRouter.exactInputSingle(params, {
          value: amountIn,
          gasPrice: (await this.provider.getGasPrice()).mul(105).div(100),
        });

        console.log(`Swap transaction hash: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`Swap confirmed in block ${receipt.blockNumber}`);
        return { tx, receipt };
      } catch (error) {
        if (attempt < 3) {
          console.log('ERROR_CODE:', error.code);
          return await swap(attempt + 1);
        }
        throw error;
      }
    };

    const { tx, receipt } = await swap(1);

    const logs = receipt.events.filter(
      (e: any) => e.address === tokenOut.address[this.chainId],
    );
    const amountOut = ethers.BigNumber.from(logs[0].data);
    const formattedAmountOut = ethers.utils.formatUnits(
      amountOut,
      tokenOut.decimals,
    );

    // const usdAmountIn = await this.web3UtilsService.getUsdPrice(
    //   tokens.WETH.address[this.chainId],
    //   Number(formattedAmount),
    // );
    // const usdAmountOut = await this.web3UtilsService.getUsdPrice(
    //   tokenOut.address[this.chainId],
    //   Number(formattedAmountOut),
    // );

    await this.transactionRepository.save({
      transactionHash: tx.hash,
      protocol: Protocol.UNISWAP,
      type: TransactionType.SWAP,
      token: `ETH-${tokenOutSymbol}`,
      amount: formattedAmount,
      isSuccess: true,
      user,
    });

    return {
      transactionHash: tx.hash,
      action: 'EthSwap',
      protocol: 'uniswap',
      tokenIn: 'ETH',
      amountIn: Number(formattedAmount),
      tokenOut: tokenOutSymbol,
      amountOut: Number(formattedAmountOut),
    };
  }
}
