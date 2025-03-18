import { Injectable, BadRequestException } from '@nestjs/common';
import { ethers } from 'ethers';
import { ConfigService } from '@nestjs/config';
import { Protocol, TransactionType } from '../entities/transaction.entity';
import { chains, ChainId } from '../config/chains.config';
import { User } from '../../auth/entities/user.entity';
import { aaveAddresses } from './config/aave.config';
import { WalletService } from '../../auth/wallet.service';
import { TokenSymbol, tokens } from '../config/tokens.config';
import { Web3UtilsService } from '../utils/web3-utils.service';
import { abi as poolAddressProviderABI } from '@aave/core-v3/artifacts/contracts/protocol/configuration/PoolAddressesProvider.sol/PoolAddressesProvider.json';
import { abi as poolAbi } from '@aave/core-v3/artifacts/contracts/interfaces/IPool.sol/IPool.json';
import { abi as erc20Abi } from '@aave/core-v3/artifacts/contracts/dependencies/openzeppelin/contracts/ERC20.sol/ERC20.json';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import wrappedTokenGatewayV3ABI from './ABIs/wrappedTokenGatewayV3ABI.json';

@Injectable()
export class AaveService {
  private provider: ethers.providers.JsonRpcProvider;
  private chainId: ChainId;
  private wallet: ethers.Wallet;
  private poolAddressProviderContract: ethers.Contract;
  private wtGatewayContract: ethers.Contract;
  private poolContract: ethers.Contract;

  constructor(
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private configService: ConfigService,
    private web3UtilsService: Web3UtilsService,
    private walletService: WalletService,
  ) {
    this.chainId = this.configService.get<ChainId>('CHAIN_ID') || 1;
    this.provider = new ethers.providers.JsonRpcProvider(
      chains[this.chainId].rpcUrl,
    );
  }

  private async initializeContracts(apiKey: string, isNative: boolean) {
    this.wallet = await this.walletService.getWalletFromApiKey(apiKey);
    this.wallet = this.wallet.connect(this.provider);

    this.poolAddressProviderContract = new ethers.Contract(
      aaveAddresses[this.chainId].poolAddressProvider,
      poolAddressProviderABI,
      this.wallet,
    );
    const poolProxyAddress = await this.poolAddressProviderContract.getPool();

    this.poolContract = new ethers.Contract(
      poolProxyAddress,
      poolAbi,
      this.wallet,
    );
    if (isNative) {
      this.wtGatewayContract = new ethers.Contract(
        aaveAddresses[this.chainId].wrappedTokenGatewayV3,
        wrappedTokenGatewayV3ABI,
        this.wallet,
      );
    }
  }

  async supply(
    amount: string,
    tokenSymbol: TokenSymbol,
    user: User,
    apiKey: string,
  ) {
    const token = tokens[tokenSymbol];
    await this.initializeContracts(apiKey, token.isNative);

    if (token.isNative) {
      return await this.supplyEth(amount, user);
    } else {
      return await this.supplyToken(amount, tokenSymbol, user);
    }
  }

  private async supplyEth(amount: string, user: User) {
    const ethAmount = ethers.BigNumber.from(amount);
    const formattedAmount = ethers.utils.formatUnits(amount, 'ether');

    const userBalance = await this.wallet.getBalance();
    if (userBalance.lt(ethAmount)) {
      throw new BadRequestException(
        'Not enough balance for requested supply amount',
      );
    }

    const wtGatewayContract = new ethers.Contract(
      aaveAddresses[this.chainId].wrappedTokenGatewayV3,
      wrappedTokenGatewayV3ABI,
      this.wallet,
    );

    const supply = async (attempt: number) => {
      try {
        const tx = await wtGatewayContract.depositETH(
          this.poolContract.address,
          this.wallet.address,
          0,
          {
            value: ethAmount,
            gasPrice: (await this.provider.getGasPrice()).mul(105).div(100),
          },
        );

        const receipt = await tx.wait();

        return {
          transactionHash: tx.hash,
          action: 'Supply',
          protocol: 'aave',
          token: 'ETH',
          amount: formattedAmount,
        };
      } catch (error) {
        if (attempt < 3) {
          console.log('ERROR_CODE : ', error.code);
          return await supply(attempt + 1);
        }
        throw error;
      }
    };

    const result = await supply(1);
    await this.transactionRepository.save({
      transactionHash: result.transactionHash,
      protocol: Protocol.AAVE,
      type: TransactionType.SUPPLY,
      token: 'ETH',
      amount: formattedAmount,
      isSuccess: true,
      user,
    });
    return result;
  }

  async supplyToken(
    amount: string,
    tokenSymbol: TokenSymbol,
    user: User, // fi
  ) {
    const token = tokens[tokenSymbol];
    const tokenContract = new ethers.Contract(
      token.address[this.chainId],
      erc20Abi,
      this.wallet,
    );

    const supplyAmount = ethers.BigNumber.from(amount);
    const formattedTokenAmount = ethers.utils.formatUnits(
      amount,
      token.decimals,
    );

    const userBalance = await tokenContract.balanceOf(this.wallet.address);
    if (userBalance.lt(supplyAmount)) {
      throw new BadRequestException(
        'Not enough balance for requested supply amount',
      );
    }

    // Approve function with retry logic
    const approve = async (attempt: number) => {
      try {
        console.log('='.repeat(50));
        const approveTx = await tokenContract.approve(
          this.poolContract.address,
          ethers.constants.MaxUint256,
          {
            gasPrice: (await this.provider.getGasPrice()).mul(105).div(100),
          },
        );

        console.log(`Approve transaction hash: ${approveTx.hash}`);
        const approveReceipt = await approveTx.wait();
        console.log(
          `Approve transaction confirmed in block ${approveReceipt.blockNumber}`,
        );
      } catch (error: any) {
        if (attempt < 3) {
          console.log('ERROR_CODE : ', error.code);
          console.log(
            ` Transaction failed, trying again attempt ${attempt + 1}...`,
          );
          await approve(attempt + 1);
        } else {
          console.error(
            `Maximum retry attempts reached for ${token.symbol}. Error details:`,
            error,
          );
          throw new BadRequestException(
            `Token ${token.symbol} approval failed after 3 attempts: ${error.message}`,
          );
        }
      }
    };

    const allowance = ethers.BigNumber.from(
      await tokenContract.allowance(
        this.wallet.address,
        this.poolContract.address,
      ),
    );

    if (allowance.lt(supplyAmount)) {
      await approve(1);
    }

    // Supply function with retry logic
    const supply = async (attempt: number) => {
      console.log('='.repeat(50));
      try {
        const tx = await this.poolContract.supply(
          token.address[this.chainId],
          supplyAmount,
          this.wallet.address,
          0,
          {
            gasPrice: (await this.provider.getGasPrice()).mul(105).div(100),
          },
        );

        console.log(`Supply transaction hash: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(
          `Supply transaction confirmed in block ${receipt.blockNumber}`,
        );
        console.log(
          ` ---- Supplied ${formattedTokenAmount} ${token.symbol} on Aave ----`,
        );

        return {
          transactionHash: tx.hash,
          action: 'Supply',
          protocol: 'aave',
          token: token.symbol,
          amount: formattedTokenAmount,
        };
      } catch (error: any) {
        if (attempt < 3) {
          console.log('ERROR_CODE : ', error.code);
          console.log(
            ` Transaction failed, trying again attempt ${attempt + 1}...`,
          );
          await supply(attempt + 1);
        } else {
          throw error;
        }
      }
    };

    // Use user data directly for transactions
    const result = await supply(1);

    // Create transaction properly
    await this.transactionRepository.save({
      transactionHash: result.transactionHash,
      protocol: Protocol.AAVE,
      type: TransactionType.SUPPLY,
      token: result.token,
      amount: result.amount,
      isSuccess: true,
      user: user,
    });

    return result;
  }
}
