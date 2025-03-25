import { Module } from '@nestjs/common';
import { UniswapController } from './uniswap.controller';
import { UniswapService } from './uniswap.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../entities/transaction.entity';
import { ConfigModule } from '@nestjs/config';
import { WalletService } from '../../auth/wallet.service';
import { Web3UtilsModule } from '../utils/web3-utils.module';
import { User } from '../../auth/entities/user.entity';
import { AuthModule } from '../../auth/auth.module';
import { LiquidityPoolsService } from './liquidity-pools.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, User]),
    ConfigModule,
    Web3UtilsModule,
    AuthModule,
  ],
  controllers: [UniswapController],
  providers: [UniswapService, LiquidityPoolsService, WalletService],
  exports: [UniswapService],
})
export class UniswapModule {}
