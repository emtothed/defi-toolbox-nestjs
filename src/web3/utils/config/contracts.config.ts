import { ChainId } from '../../config/chains.config';

interface ContractAddresses {
  priceFeed: string;
}

export const contractAddresses: Record<ChainId, ContractAddresses> = {
  1: {
    priceFeed: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // Mainnet Chainlink ETH/USD
  },
  11155111: {
    priceFeed: '0x694AA1769357215DE4FAC081bf1f309aDC325306', // Sepolia Chainlink ETH/USD
  },
} as const;
