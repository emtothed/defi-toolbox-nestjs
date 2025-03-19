import { ChainId } from '../../config/chains.config';
import { TokenSymbol } from '../../config/tokens.config';

interface AaveContractAddresses {
  poolAddressProvider: string;
  wrappedTokenGatewayV3: string;
}

export const aaveContractAddresses: Record<ChainId, AaveContractAddresses> = {
  1: {
    //tod : check addresses on eth mainnet
    poolAddressProvider: '0x2f39d218133AFaB8F2B819B1066c7E434Ad94E9e',
    wrappedTokenGatewayV3: '0xD322A49006FC828F9B5B37Ab215F99B4E5caB19C',
  },
  11155111: {
    poolAddressProvider: '0x012bAC54348C0E635dCAc9D5FB99f06F24136C9A',
    wrappedTokenGatewayV3: '0x387d311e47e80b498169e6fb51d3193167d89F7D',
  },
};

export const aTokens: Record<ChainId, Record<TokenSymbol, string>> = {
  1: {
    USDC: '',
    USDT: '',
    WETH: '',
    ETH: '',
  },
  11155111: {
    USDC: '0x16dA4541aD1807f4443d92D26044C1147406EB80',
    USDT: '0xAF0F6e8b0Dc5c913bbF4d14c22B4E78Dd14310B6',
    WETH: '0x5b071b590a59395fE4025A0Ccc1FcC931AAc1830',
    ETH: '0x5b071b590a59395fE4025A0Ccc1FcC931AAc1830',
  },
};
