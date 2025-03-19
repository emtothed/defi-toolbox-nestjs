import {
  Controller,
  Post,
  Body,
  UseGuards,
  Headers,
  Req,
} from '@nestjs/common';
import { AaveService } from './aave.service';
import { ApiKeyGuard } from '../../auth/guards/api-key.guard';
import { SupplyDto } from './dto/supply.dto';
import { WithdrawDto } from './dto/withdraw.dto';
import { User } from '../../auth/entities/user.entity';

@UseGuards(ApiKeyGuard)
@Controller('web3/aave')
export class AaveController {
  constructor(private readonly aaveService: AaveService) {}

  @Post('supply')
  async supply(
    @Body() supplyDto: SupplyDto,
    @Headers('x-api-key') apiKey: string,
    @Req() request: Request & { user: User },
  ) {
    return await this.aaveService.supply(
      supplyDto.amount,
      supplyDto.token,
      request.user,
      apiKey,
    );
  }

  @Post('withdraw')
  async withdraw(
    @Body() withdrawDto: WithdrawDto,
    @Headers('x-api-key') apiKey: string,
    @Req() request: Request & { user: User },
  ) {
    return await this.aaveService.withdraw(
      withdrawDto.token,
      request.user,
      apiKey,
    );
  }
}
