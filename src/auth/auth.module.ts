import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { WalletService } from './wallet.service';
import { User } from './entities/user.entity';
import { UnverifiedUser } from './entities/unverified-user.entity';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, UnverifiedUser]), EmailModule],
  controllers: [AuthController],
  providers: [AuthService, WalletService],
  exports: [AuthService, WalletService],
})
export class AuthModule {}
