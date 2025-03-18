import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';
import { TokenSymbol } from '../config/tokens.config';

export enum Protocol {
  AAVE = 'aave',
  // Add other protocols later
}

export enum TransactionType {
  SUPPLY = 'supply',
  WITHDRAW = 'withdraw',
  // Add other types later
}

@Entity()
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  transactionHash: string;

  @Column({
    type: 'enum',
    enum: Protocol,
  })
  protocol: Protocol;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({
    type: 'enum',
    enum: TokenSymbol,
  })
  token: string;

  @Column('decimal', { precision: 65, scale: 18 })
  amount: string;

  @Column({ default: false })
  isSuccess: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.transactions)
  user: User;
}
