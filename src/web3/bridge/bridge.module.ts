import { Module } from '@nestjs/common';
import { BridgeController } from './bridge.controller';
import { BridgeService } from './bridge.service';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Transaction } from '../entities/transaction.entity';
import { WalletService } from '../../auth/wallet.service';

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Transaction])],
  controllers: [BridgeController],
  providers: [BridgeService, WalletService],
  exports: [BridgeService],
})
export class BridgeModule {}
