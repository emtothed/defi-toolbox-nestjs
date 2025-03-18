import { Module } from '@nestjs/common';
import { AaveController } from './aave.controller';
import { AaveService } from './aave.service';
import { AuthModule } from '../../auth/auth.module';
import { Web3UtilsModule } from '../utils/web3-utils.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Transaction } from '../entities/transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction]),
    Web3UtilsModule,
    ConfigModule,
    AuthModule,
  ],
  controllers: [AaveController],
  providers: [AaveService],
  exports: [AaveService],
})
export class AaveModule {}
