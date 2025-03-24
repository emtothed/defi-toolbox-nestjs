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
import { Web3UtilsService } from '../utils/web3-utils.service';
import erc20Abi from './ABI/ERC20.abi.json';
import { nearestUsableTick } from '@uniswap/v3-sdk';
import positionManagerABI from './ABI/NonfungiblePositionManagerABI.json';
import uniswapFactoryABI from './ABI/uniswapFactoryABI.json';
import uniswapPoolABI from './ABI/uniswapPoolABI.json';
import { chains } from '../config/chains.config';
import { uniswapConfig } from './config/uniswap.config';

@Injectable()
export class LiquidityPoolsService {
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

  //====================================================
  //============== ADD LIQUIDITY =======================
  //====================================================
  async addLiquidity(
    token0Symbol: TokenSymbol,
    token1Symbol: TokenSymbol,
    amount0: string | undefined,
    amount1: string | undefined,
    useFullBalance: boolean,
    user: User,
    apiKey: string,
  ) {
    const wallet = await this.walletService.getWalletFromApiKey(apiKey);
    const connectedWallet = wallet.connect(this.provider);

    const token0 = tokens[token0Symbol];
    const token1 = tokens[token1Symbol];

    let token0Address = token0.address[this.chainId];
    let token1Address = token1.address[this.chainId];
    let amount0Value = amount0;
    let amount1Value = amount1;

    // Get pool address and ensure token order
    const factoryContract = new ethers.Contract(
      uniswapConfig.factoryAddress,
      uniswapFactoryABI,
      this.provider,
    );

    const poolAddress = await factoryContract.getPool(
      token0Address,
      token1Address,
      uniswapConfig.defaultLpFee,
    );

    if (poolAddress === ethers.constants.AddressZero) {
      throw new BadRequestException('No pool exists for these tokens');
    }

    // Check token order and swap if necessary
    const poolContract = new ethers.Contract(
      poolAddress,
      uniswapPoolABI,
      this.provider,
    );
    const poolToken0 = await poolContract.token0();
    if (poolToken0 !== token0Address) {
      [token0Address, token1Address] = [token1Address, token0Address];
      [amount0Value, amount1Value] = [amount1Value, amount0Value];
    }

    const token0Contract = new ethers.Contract(
      token0Address,
      erc20Abi,
      connectedWallet,
    );
    const token1Contract = new ethers.Contract(
      token1Address,
      erc20Abi,
      connectedWallet,
    );

    // Get amounts if using full balance
    if (useFullBalance) {
      amount0Value = (
        await token0Contract.balanceOf(wallet.address)
      ).toString();
      amount1Value = (
        await token1Contract.balanceOf(wallet.address)
      ).toString();
    }

    if (!amount0Value || !amount1Value) {
      throw new BadRequestException(
        'Amounts must be provided if not using full balance',
      );
    }

    const amount0Desired = ethers.BigNumber.from(amount0Value);
    const amount1Desired = ethers.BigNumber.from(amount1Value);

    // Approve tokens
    await this.approveToken(token0Contract, amount0Desired);
    await this.approveToken(token1Contract, amount1Desired);

    // Calculate ticks for full range
    const tickSpacing = 60;
    const lowerTick = nearestUsableTick(-887270, tickSpacing);
    const upperTick = nearestUsableTick(887270, tickSpacing);

    const positionManagerContract = new ethers.Contract(
      uniswapConfig.positionManagerAddress,
      positionManagerABI,
      connectedWallet,
    );

    const mintParams = {
      token0: token0Address,
      token1: token1Address,
      fee: uniswapConfig.defaultLpFee,
      tickLower: lowerTick,
      tickUpper: upperTick,
      amount0Desired,
      amount1Desired,
      amount0Min: 0,
      amount1Min: 0,
      recipient: wallet.address,
      deadline: Math.floor(Date.now() / 1000) + 1200,
    };

    const { tx, receipt, tokenId, amounts } = await this.mint(
      positionManagerContract,
      mintParams,
      token0Contract,
      token1Contract,
    );

    // Get USD amounts
    // const [usdAmount0, usdAmount1] = await Promise.all([
    //   this.web3UtilsService.getUsdPrice(token0Address, amounts.amount0),
    //   this.web3UtilsService.getUsdPrice(token1Address, amounts.amount1),
    // ]);

    await this.transactionRepository.save({
      transactionHash: tx.hash,
      protocol: Protocol.UNISWAP,
      type: TransactionType.ADD_LIQUIDITY,
      token: `${token0Symbol}-${token1Symbol}`,
      amount: `${amounts.amount0}-${amounts.amount1}`,
      isSuccess: true,
      user,
    });

    return {
      transactionHash: tx.hash,
      action: 'AddLiquidity',
      protocol: 'uniswap',
      lpTokenId: tokenId,
      token0: token0Symbol,
      amount0Added: amounts.amount0,
      token1: token1Symbol,
      amount1Added: amounts.amount1,
    };
  }

  private async approveToken(
    tokenContract: ethers.Contract,
    amount: ethers.BigNumber,
    attempt = 1,
  ) {
    try {
      const tx = await tokenContract.approve(
        uniswapConfig.positionManagerAddress,
        amount,
        {
          gasPrice: (await this.provider.getGasPrice()).mul(105).div(100),
        },
      );
      await tx.wait();
    } catch (error) {
      if (attempt < 3) {
        return this.approveToken(tokenContract, amount, attempt + 1);
      }
      throw error;
    }
  }

  private async mint(
    positionManagerContract: ethers.Contract,
    params: any,
    token0Contract: ethers.Contract,
    token1Contract: ethers.Contract,
    attempt = 1,
  ) {
    try {
      const tx = await positionManagerContract.mint(params, {
        gasPrice: (await this.provider.getGasPrice()).mul(105).div(100),
      });
      const receipt = await tx.wait();

      const eventSignature =
        '0x3067048beee31b25b2f1681f88dac838c8bba36af25bfb2b7cf7473a5847e35f';
      const log = receipt.events.find(
        (e: any) => e.topics[0] === eventSignature,
      );

      const tokenId = parseInt(log.topics[1], 16);
      const decimal0 = await token0Contract.decimals();
      const decimal1 = await token1Contract.decimals();

      const amount0Added = ethers.utils.formatUnits(
        ethers.BigNumber.from(log.data.slice(0, 66)),
        decimal0,
      );
      const amount1Added = ethers.utils.formatUnits(
        ethers.BigNumber.from('0x' + log.data.slice(66, 130)),
        decimal1,
      );

      return {
        tx,
        receipt,
        tokenId,
        amounts: {
          amount0: Number(amount0Added),
          amount1: Number(amount1Added),
        },
      };
    } catch (error) {
      if (attempt < 3) {
        return this.mint(
          positionManagerContract,
          params,
          token0Contract,
          token1Contract,
          attempt + 1,
        );
      }
      throw error;
    }
  }

  //====================================================
  //============== REMOVE LIQUIDITY ====================
  //====================================================
  async removeLiquidity(tokenId: number, user: User, apiKey: string) {
    const wallet = await this.walletService.getWalletFromApiKey(apiKey);
    const connectedWallet = wallet.connect(this.provider);

    const positionManagerContract = new ethers.Contract(
      uniswapConfig.positionManagerAddress,
      positionManagerABI,
      connectedWallet,
    );

    const position = await positionManagerContract.positions(tokenId);
    const liquidity = position.liquidity.toString();

    if (liquidity === '0') {
      throw new BadRequestException('NO LIQUIDITY TO REMOVE');
    }

    // Decrease Liquidity
    const decreaseLiquidityParams = {
      tokenId,
      liquidity,
      amount0Min: 0,
      amount1Min: 0,
      deadline: Math.floor(Date.now() / 1000) + 3600,
    };

    const decreaseLiquidity = async (attempt: number) => {
      try {
        const tx = await positionManagerContract.decreaseLiquidity(
          decreaseLiquidityParams,
          { gasPrice: (await this.provider.getGasPrice()).mul(105).div(100) },
        );
        const receipt = await tx.wait();
        return { tx, receipt };
      } catch (error) {
        if (attempt < 3) {
          return await decreaseLiquidity(attempt + 1);
        }
        throw error;
      }
    };

    const { tx: decreaseTx } = await decreaseLiquidity(1);

    // Collect
    const collectParams = {
      tokenId,
      recipient: wallet.address,
      amount0Max: ethers.BigNumber.from(2).pow(128).sub(1),
      amount1Max: ethers.BigNumber.from(2).pow(128).sub(1),
    };

    const collect = async (attempt: number) => {
      try {
        const tx = await positionManagerContract.collect(collectParams, {
          gasPrice: (await this.provider.getGasPrice()).mul(105).div(100),
        });
        const receipt = await tx.wait();
        return { tx, receipt };
      } catch (error) {
        if (attempt < 3) {
          return await collect(attempt + 1);
        }
        throw error;
      }
    };

    const { tx: collectTx, receipt: collectReceipt } = await collect(1);

    // Get pool and token information
    const collectEventSignature =
      '0x40d0efd1a53d60ecbf40971b9daf7dc90178c3aadc7aab1765632738fa8b8f01';
    const transferEventSignature =
      '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

    const collectLog = collectReceipt.events.find(
      (e: any) => e.topics[0] === collectEventSignature,
    );
    const transferLog = collectReceipt.events.find(
      (e: any) => e.topics[0] === transferEventSignature,
    );

    const poolAddress = `0x${transferLog.topics[1].slice(26, 66)}`;
    const poolContract = new ethers.Contract(
      poolAddress,
      uniswapPoolABI,
      this.provider,
    );

    const [token0Address, token1Address] = await Promise.all([
      poolContract.token0(),
      poolContract.token1(),
    ]);

    const token0Contract = new ethers.Contract(
      token0Address,
      erc20Abi,
      connectedWallet,
    );
    const token1Contract = new ethers.Contract(
      token1Address,
      erc20Abi,
      connectedWallet,
    );

    const [decimal0, symbol0, decimal1, symbol1] = await Promise.all([
      token0Contract.decimals(),
      token0Contract.symbol(),
      token1Contract.decimals(),
      token1Contract.symbol(),
    ]);

    const amount0Removed = Number(
      ethers.utils.formatUnits(
        ethers.BigNumber.from(this.extract.getValue(collectLog.data, 2)),
        decimal0,
      ),
    );
    const amount1Removed = Number(
      ethers.utils.formatUnits(
        ethers.BigNumber.from(this.extract.getValue(collectLog.data, 3)),
        decimal1,
      ),
    );

    // Get USD amounts
    // const [usdAmount0, usdAmount1] = await Promise.all([
    //   this.web3UtilsService.getUsdPrice(token0Address, amount0Removed),
    //   this.web3UtilsService.getUsdPrice(token1Address, amount1Removed),
    // ]);

    await this.transactionRepository.save({
      transactionHash: collectTx.hash,
      protocol: Protocol.UNISWAP,
      type: TransactionType.REMOVE_LIQUIDITY,
      token: `${symbol0}-${symbol1}`,
      amount: `${amount0Removed}-${amount1Removed}`,
      isSuccess: true,
      user,
    });

    return {
      decreaseLiquidityTxHash: decreaseTx.hash,
      collectTxHash: collectTx.hash,
      action: 'RemoveLiquidity',
      protocol: 'uniswap',
      lpTokenId: tokenId,
      token0: symbol0,
      amount0Collected: amount0Removed,
      token1: symbol1,
      amount1Collected: amount1Removed,
    };
  }

  extract = {
    start(loc: number) {
      return (loc - 1) * 64 + 2;
    },
    end(loc: number) {
      return loc * 64 + 2;
    },
    getValue(data: string, loc: number) {
      return data.slice(this.start(loc), this.end(loc));
    },
    getAll(data: string) {
      let values: any[] = [];
      for (let i = 0; i < (data.length - 2) / 64; i++) {
        values[i] = data.slice(this.start(i + 1), this.end(i + 1));
      }
      return values;
    },
  };
}
