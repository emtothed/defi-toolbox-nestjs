import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import { ConfigService } from '@nestjs/config';
import { priceFeedABI } from './ABIs/priceFeed.abi';
import { contractAddresses } from './config/contracts.config';
import { chains, ChainId } from '../config/chains.config';

@Injectable()
export class Web3UtilsService {
  private provider: ethers.providers.JsonRpcProvider;
  private chainId: ChainId;

  constructor(private configService: ConfigService) {
    this.chainId = this.configService.get<ChainId>('CHAIN_ID') || 1;
    this.provider = new ethers.providers.JsonRpcProvider(
      chains[this.chainId].rpcUrl,
    );
  }

  async getNetworkGasPrice() {
    const gasPrice = Number(await this.provider.getGasPrice());
    const ethPrice = 3512; // Note: We might want to make this dynamic later
    const gasUsed = 300000;
    const txFee = ((gasPrice * gasUsed) / 10 ** 18) * ethPrice;

    return {
      gasPrice: gasPrice,
      estimatedFee: txFee,
      gasUsed: gasUsed,
    };
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
}
