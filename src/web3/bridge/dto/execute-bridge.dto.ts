import { IsNotEmpty } from 'class-validator';
import { Route } from '@lifi/sdk';

export class ExecuteBridgeDto {
  @IsNotEmpty()
  route: Route;
}
