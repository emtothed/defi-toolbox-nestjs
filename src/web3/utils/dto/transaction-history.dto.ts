import { IsEnum, IsOptional } from 'class-validator';
import { Protocol, TransactionType } from '../../entities/transaction.entity';

export class TransactionHistoryDto {
  @IsEnum(Protocol)
  @IsOptional()
  protocol?: Protocol;

  @IsEnum(TransactionType)
  @IsOptional()
  type?: TransactionType;

  @IsOptional()
  token?: string;
}