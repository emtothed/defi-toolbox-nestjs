import { BadRequestException, Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import { ConfigService } from '@nestjs/config';
import { priceFeedABI } from './ABIs/priceFeed.abi';
import { contractAddresses } from './config/contracts.config';
import { chains, ChainId } from '../config/chains.config';
import { WalletService } from '../../auth/wallet.service';
import erc20Abi from './ABIs/ERC20.abi.json';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { User } from '../../auth/entities/user.entity';
import { TransactionHistoryDto } from './dto/transaction-history.dto';

@Injectable()
export class Web3UtilsService {
  private provider: ethers.providers.JsonRpcProvider;
  private chainId: ChainId;

  constructor(
    private configService: ConfigService,
    private walletService: WalletService,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
  ) {
    this.chainId = this.configService.get<ChainId>('CHAIN_ID') || 11155111;
    this.provider = new ethers.providers.JsonRpcProvider(
      chains[this.chainId].rpcUrl,
    );
  }

  async getNetworkGasPrice() {
    return Number(await this.provider.getGasPrice());
  }

  async getEthPrice(): Promise<number> {
    try {
      const priceFeedContract = new ethers.Contract(
        contractAddresses[this.chainId].priceFeed,
        priceFeedABI,
        this.provider,
      );

      const data = await priceFeedContract.latestRoundData();
      const formattedPrice = Number(ethers.utils.formatUnits(data.answer, 8));

      console.log('='.repeat(50));
      console.log('ETH Price Data:');
      console.log('Network:', chains[this.chainId].name);
      console.log('Price:', formattedPrice, 'USD');
      console.log(
        'Updated At:',
        new Date(data.updatedAt.toNumber() * 1000).toLocaleString(),
      );
      console.log('='.repeat(50));

      return formattedPrice;
    } catch (error) {
      console.error(
        `Error fetching ETH price on ${chains[this.chainId].name}:`,
        error,
      );
      throw new Error(
        `Failed to fetch ETH price on ${chains[this.chainId].name}`,
      );
    }
  }

  async getWalletAddress(apiKey: string): Promise<string> {
    const wallet = await this.walletService.getWalletFromApiKey(apiKey);
    return wallet.address;
  }

  async getBalance(
    tokenAddress: string,
    apiKey: string,
  ): Promise<{ balance: string; symbol: string; decimals: number }> {
    const wallet = await this.walletService.getWalletFromApiKey(apiKey);

    if (tokenAddress === ethers.constants.AddressZero) {
      const balance = await this.provider.getBalance(wallet.address);
      return {
        balance: ethers.utils.formatEther(balance),
        symbol: 'ETH',
        decimals: 18,
      };
    }

    const tokenContract = new ethers.Contract(
      tokenAddress,
      erc20Abi,
      this.provider,
    );

    const [balance, symbol, decimals] = await Promise.all([
      tokenContract.balanceOf(wallet.address),
      tokenContract.symbol(),
      tokenContract.decimals(),
    ]);

    return {
      balance: ethers.utils.formatUnits(balance, decimals),
      symbol,
      decimals,
    };
  }

  async getPossibleMaxAmount(apiKey: string): Promise<ethers.BigNumber> {
    // Getting user balance from provider

    let userBalanceInWei;
    try {
      const userBalance = await this.getBalance(
        ethers.constants.AddressZero,
        apiKey,
      );
      userBalanceInWei = ethers.utils.parseUnits(
        userBalance.balance,
        userBalance.decimals,
      );
    } catch {
      throw new BadRequestException('Failed to get balance of given address.');
    }

    // Calculating the max possible amount to transfer
    const gasPrice = ethers.BigNumber.from(await this.getNetworkGasPrice());
    let maxGasUsed = ethers.BigNumber.from(210000); // transfer gas fee
    const transferGasFeeInWei = gasPrice.mul(maxGasUsed);

    if (userBalanceInWei.lt(transferGasFeeInWei)) {
      throw new BadRequestException('Balance less than estimated gas fees.');
    }
    const possibleMaxAmountInWei = userBalanceInWei.sub(transferGasFeeInWei);
    console.log(
      ` Possible max amount to transfer is : ${ethers.utils.formatEther(
        possibleMaxAmountInWei,
      )}`,
    );

    return possibleMaxAmountInWei;
  }

  async getTransactionHistory(
    user: User,
    filters?: TransactionHistoryDto,
  ): Promise<Transaction[]> {
    const queryBuilder = this.transactionRepository
      .createQueryBuilder('transaction')
      .where('transaction.userId = :userId', { userId: user.id })
      .orderBy('transaction.createdAt', 'DESC');

    if (filters?.protocol) {
      queryBuilder.andWhere('transaction.protocol = :protocol', {
        protocol: filters.protocol,
      });
    }

    if (filters?.type) {
      queryBuilder.andWhere('transaction.type = :type', {
        type: filters.type,
      });
    }

    if (filters?.token) {
      queryBuilder.andWhere('transaction.token LIKE :token', {
        token: `%${filters.token}%`,
      });
    }

    return await queryBuilder.getMany();
  }
}
