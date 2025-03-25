import { ChainId } from './chains.config';

export enum TokenSymbol {
  USDC = 'USDC',
  USDT = 'USDT',
  WETH = 'WETH',
  ETH = 'ETH',
}

export interface Token {
  address: Record<ChainId, string>;
  decimals: number;
  symbol: TokenSymbol;
  isNative?: boolean;
}

export const tokens: Record<TokenSymbol, Token> = {
  // ====== NEEDS TO BE CHECKED ====== //todo
  [TokenSymbol.USDC]: {
    address: {
      1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      // 11155111: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      11155111: '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8', //aave USDC token on sepolia
    },
    decimals: 6,
    symbol: TokenSymbol.USDC,
  },
  [TokenSymbol.USDT]: {
    address: {
      1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      11155111: '0x0Bd5F04B456ab34a2aB3e9d556Fe5b3A41A0BC8D',
    },
    decimals: 6,
    symbol: TokenSymbol.USDT,
  },
  [TokenSymbol.WETH]: {
    address: {
      1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      11155111: '0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9',
    },
    decimals: 18,
    symbol: TokenSymbol.WETH,
    isNative: true,
  },
  [TokenSymbol.ETH]: {
    address: {
      1: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      // 11155111: '0x0000000000000000000000000000000000000000',
      11155111: '0xfff9976782d46cc05630d1f6ebab18b2324d6b14', // uniswap weth on sepolia
    },
    decimals: 18,
    symbol: TokenSymbol.ETH,
    isNative: true,
  },
} as const;
