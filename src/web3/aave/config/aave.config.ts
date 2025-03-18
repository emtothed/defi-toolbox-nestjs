import { ChainId } from '../../config/chains.config';

interface AaveAddresses {
  poolAddressProvider: string;
  wrappedTokenGatewayV3: string;
}

export const aaveAddresses: Record<ChainId, AaveAddresses> = {
  1: {
    //tod : check addresses on eth mainnet
    poolAddressProvider: '0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e',
    wrappedTokenGatewayV3: '0xD322A49006FC828F9B5B37Ab215F99B4E5caB19C',
  },
  11155111: {
    poolAddressProvider: '0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A',
    wrappedTokenGatewayV3: '0x387d311e47e80b498169e6fb51d3193167d89F7D',
  },
} as const;
