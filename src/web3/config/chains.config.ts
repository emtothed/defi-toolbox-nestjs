export type ChainId = 1 | 11155111; // 1 for mainnet, 11155111 for sepolia

export interface Chain {
  name: string;
  rpcUrl: string;
  chainId: ChainId;
}

export const chains: Record<ChainId, Chain> = {
  1: {
    name: 'Ethereum Mainnet',
    rpcUrl: 'http://127.0.0.1:8545',
    chainId: 1,
  },
  11155111: {
    name: 'Sepolia Testnet',
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    chainId: 11155111,
  },
} as const;
