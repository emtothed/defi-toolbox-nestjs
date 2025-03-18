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
import { WalletService } from './wallet.service';

interface EncryptedData {
  iv: string;
  encrypted: string;
  authTag: string;
}

@Injectable()
export class AuthService {
  private readonly saltRounds: number;

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UnverifiedUser)
    private unverifiedUserRepository: Repository<UnverifiedUser>,
    private configService: ConfigService,
    private emailService: EmailService,
    private walletService: WalletService,
  ) {
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
      // Generate wallet using WalletService
      const { wallet, encryptedPrivateKey } =
        this.walletService.generateWallet();

      // Generate API key with tag
      const apiKeyTag = crypto.randomBytes(8).toString('hex');
      const rawApiKey = crypto.randomBytes(32).toString('hex');
      const apiKey = `${apiKeyTag}${rawApiKey}`;
      const apiKeyHash = await bcrypt.hash(rawApiKey, this.saltRounds);

      // Create verified user
      const user = this.userRepository.create({
        email: unverifiedUser.email,
        password: unverifiedUser.password,
        walletAddress: wallet.address,
        encryptedPrivateKey,
        apiKeyHash,
        apiKeyTag,
      });

      await this.userRepository.save(user);
      await this.unverifiedUserRepository.remove(unverifiedUser);
      await this.emailService.sendApiKey(user.email, apiKey);

      return {
        message: 'Email verified. Your API key has been sent to your email.',
      };
    } catch (error) {
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

    // Generate new API key with tag
    const apiKeyTag = crypto.randomBytes(8).toString('hex');
    const rawApiKey = crypto.randomBytes(32).toString('hex');
    const apiKey = `${apiKeyTag}${rawApiKey}`;
    const apiKeyHash = await bcrypt.hash(rawApiKey, this.saltRounds);

    await this.userRepository.update(user.id, { apiKeyHash, apiKeyTag });
    await this.emailService.sendApiKey(user.email, apiKey);

    return { message: 'New API key has been sent to your email.' };
  }

  async validateApiKeyAndGetUser(apiKey: string) {
    try {
      const apiKeyTag = apiKey.slice(0, 16);
      const rawApiKey = apiKey.slice(16);

      const user = await this.userRepository.findOne({
        where: { apiKeyTag },
        select: ['id', 'apiKeyHash', 'encryptedPrivateKey', 'email'],
      });

      if (!user || !(await bcrypt.compare(rawApiKey, user.apiKeyHash))) {
        throw new UnauthorizedException('Invalid API key');
      }

      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid API key');
    }
  }
}
