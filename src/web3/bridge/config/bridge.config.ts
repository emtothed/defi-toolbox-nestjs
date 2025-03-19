import { TokenSymbol, tokens } from '../../config/tokens.config';

export enum Network {
  ETHEREUM = '1',
  BASE = '8453',
  // Add other networks as needed
}

export const bridgeConfig = {
  integrator: 'Grove',
  apiKey: process.env.LIFI_API_KEY,
  defaultSlippage: 0.1, // 10%
};

export const bridgeChains = {
  [Network.ETHEREUM]: {
    name: 'Ethereum',
    chainId: Number(Network.ETHEREUM),
    rpcUrl: 'https://mainnet.infura.io/v3/your-infura-key',
  },
  [Network.BASE]: {
    name: 'Base',
    chainId: Number(Network.BASE),
    rpcUrl: 'https://mainnet.base.org',
  },
};
