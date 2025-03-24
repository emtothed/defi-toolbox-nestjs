import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { EmailModule } from './email/email.module';
import { configValidationSchema } from './config/config.schema';
import { ThrottlerModule } from '@nestjs/throttler';
import { Web3UtilsModule } from './web3/utils/web3-utils.module';
import { AaveModule } from './web3/aave/aave.module';
import { UniswapModule } from './web3/uniswap/uniswap.module';
import { BridgeModule } from './web3/bridge/bridge.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configValidationSchema,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_DATABASE'),
        autoLoadEntities: true,
        synchronize: configService.get('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 60000, // Time window in milliseconds
        limit: 10, // Number of requests allowed in time window
      },
    ]),
    AuthModule,
    EmailModule,
    Web3UtilsModule,
    AaveModule,
    UniswapModule,
    BridgeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
