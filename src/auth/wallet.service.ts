import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { ethers } from 'ethers';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

interface EncryptedData {
  iv: string;
  encrypted: string;
  authTag: string;
}

@Injectable()
export class WalletService {
  private readonly encryptionKey: string;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private configService: ConfigService,
  ) {
    this.encryptionKey = this.configService.get<string>(
      'WALLET_ENCRYPTION_KEY',
    );
  }

  generateWallet(): {
    wallet: ethers.Wallet;
    encryptedPrivateKey: string;
  } {
    const wallet = ethers.Wallet.createRandom();
    const encryptedPrivateKey = this.encryptPrivateKey(wallet.privateKey);
    return { wallet, encryptedPrivateKey };
  }

  async getWalletFromApiKey(apiKey: string): Promise<ethers.Wallet> {
    const apiKeyTag = apiKey.slice(0, 16);

    const user = await this.userRepository.findOne({
      where: { apiKeyTag },
      select: ['encryptedPrivateKey'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid API key');
    }

    const privateKey = this.decryptPrivateKey(user.encryptedPrivateKey);
    return new ethers.Wallet(privateKey);
  }

  private encryptPrivateKey(privateKey: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(
        'aes-256-gcm',
        Buffer.from(this.encryptionKey, 'hex'),
        iv,
      );

      const encrypted = Buffer.concat([
        cipher.update(privateKey, 'utf8'),
        cipher.final(),
      ]);

      const authTag = cipher.getAuthTag();

      return JSON.stringify({
        iv: iv.toString('hex'),
        encrypted: encrypted.toString('hex'),
        authTag: authTag.toString('hex'),
      });
    } catch (error) {
      throw new BadRequestException(
        `Error encrypting private key: ${error.message}`,
      );
    }
  }

  private decryptPrivateKey(encryptedData: string): string {
    try {
      const { iv, encrypted, authTag } = JSON.parse(
        encryptedData,
      ) as EncryptedData;

      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        Buffer.from(this.encryptionKey, 'hex'),
        Buffer.from(iv, 'hex'),
      );

      decipher.setAuthTag(Buffer.from(authTag, 'hex'));

      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encrypted, 'hex')),
        decipher.final(),
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      throw new BadRequestException('Error decrypting private key');
    }
  }
}
