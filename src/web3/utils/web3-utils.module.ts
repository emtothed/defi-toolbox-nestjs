import { Module } from '@nestjs/common';
import { Web3UtilsController } from './web3-utils.controller';
import { Web3UtilsService } from './web3-utils.service';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [Web3UtilsController],
  providers: [Web3UtilsService],
  exports: [Web3UtilsService],
})
export class Web3UtilsModule {}
