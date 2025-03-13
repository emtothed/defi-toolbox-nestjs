import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Wallet } from 'ethers';
import { User } from './entities/user.entity';
import { UnverifiedUser } from './entities/unverified-user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { GetApiKeyDto } from './dto/get-api-key.dto';
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { EmailService } from 'src/email/email.service';

interface EncryptedData {
  iv: string;
  encrypted: string;
  authTag: string;
}

@Injectable()
export class AuthService {
  private readonly encryptionKey: string;
  private readonly saltRounds: number;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UnverifiedUser)
    private unverifiedUserRepository: Repository<UnverifiedUser>,
    private configService: ConfigService,
    private emailService: EmailService,
  ) {
    this.encryptionKey = this.configService.get<string>(
      'WALLET_ENCRYPTION_KEY',
    );
    this.saltRounds = Number(this.configService.get<number>('SALT_ROUNDS'));
  }

  async register(createUserDto: CreateUserDto): Promise<{ message: string }> {
    const { email, password } = createUserDto;

    // Check if user exists in either table
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    const existingUnverifiedUser = await this.unverifiedUserRepository.findOne({
      where: { email },
    });

    if (existingUser || existingUnverifiedUser) {
      throw new ConflictException('Email already exists');
    }

    try {
      // Generate email verification token
      const emailVerificationToken = crypto.randomBytes(32).toString('hex');
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create unverified user
      const unverifiedUser = this.unverifiedUserRepository.create({
        email,
        password: hashedPassword,
        emailVerificationToken,
      });

      await this.unverifiedUserRepository.save(unverifiedUser);
      await this.emailService.sendVerificationEmail(
        email,
        emailVerificationToken,
      );

      return {
        message:
          'Registration successful. Please check your email to verify your account.',
      };
    } catch (error) {
      throw new InternalServerErrorException('Error during registration');
    }
  }

  async verifyEmail(token: string): Promise<{ message: string }> {
    const unverifiedUser = await this.unverifiedUserRepository.findOne({
      where: { emailVerificationToken: token },
      select: ['id', 'email', 'password'],
    });

    if (!unverifiedUser) {
      throw new BadRequestException('Invalid verification token');
    }

    try {
      // Generate wallet and API key
      const wallet = Wallet.createRandom();
      const encryptedPrivateKey = this.encryptPrivateKey(wallet.privateKey);
      const apiKey = crypto.randomBytes(32).toString('hex');
      const apiKeyHash = await bcrypt.hash(apiKey, this.saltRounds);

      // Create verified user
      const user = this.userRepository.create({
        email: unverifiedUser.email,
        password: unverifiedUser.password,
        walletAddress: wallet.address, // Add wallet address
        encryptedPrivateKey: encryptedPrivateKey,
        apiKeyHash,
      });

      await this.userRepository.save(user);
      await this.unverifiedUserRepository.remove(unverifiedUser);
      await this.emailService.sendApiKey(user.email, apiKey);

      return {
        message: 'Email verified. Your API key has been sent to your email.',
      };
    } catch (error) {
      console.log(error);

      throw new InternalServerErrorException('Error during verification');
    }
  }

  async getApiKey(getApiKeyDto: GetApiKeyDto): Promise<{ message: string }> {
    const { email, password } = getApiKeyDto;

    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'password', 'email'],
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate and send API key
    const apiKey = crypto.randomBytes(32).toString('hex');
    const apiKeyHash = await bcrypt.hash(apiKey, this.saltRounds);

    await this.userRepository.update(user.id, { apiKeyHash });
    await this.emailService.sendApiKey(user.email, apiKey);

    return { message: 'New API key has been sent to your email.' };
  }

  async validateApiKey(apiKey: string): Promise<boolean> {
    try {
      const user = await this.userRepository.findOne({
        where: { apiKeyHash: await bcrypt.hash(apiKey, this.saltRounds) },
      });
      return !!user;
    } catch (error) {
      throw new UnauthorizedException('Invalid API key');
    }
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
