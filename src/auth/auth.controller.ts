import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { GetApiKeyDto } from './dto/get-api-key.dto';
import { CustomThrottlerGuard } from './guards/throttle.guard';
import { Throttle } from '@nestjs/throttler';

@UseGuards(CustomThrottlerGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Stricter limit for registration
  @Throttle({ short: { limit: 3, ttl: 60000 } })
  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return await this.authService.register(createUserDto);
  }

  @Get('verify/:token')
  async verifyEmail(@Param('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  // Stricter limit for API key generation
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @Post('getApiKey') // Changed from 'api-key' to 'getApiKey'
  async getApiKey(@Body() getApiKeyDto: GetApiKeyDto) {
    return await this.authService.getApiKey(getApiKeyDto);
  }
}
