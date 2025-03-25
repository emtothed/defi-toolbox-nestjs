# DeFi Toolbox API

## Overview
A  NestJS-based API for interacting with DeFi protocols on EVM networks. Provides integration with Aave, Uniswap, and cross-chain bridging via LiFi, plus commmon interactions with evm chains.

## Features

### Protocol Integration

- **Uniswap V3**
  - Token swapping
  - ETH to token swaps
  - Liquidity pool management
  - Position management
  
- **Aave V3** : Supply & Withdraw tokens
- **LiFi Bridge** : Cross-chain transfers

### Core Features
- Secure wallet management
- Transaction history tracking
- USD price feeds
- API key authentication

## Prerequisites
- Node.js v16+
- PostgreSQL 14+
- Linux/Unix environment

## Installation

1. Clone the repository
```bash
git clone https://github.com/emtothed/defi-toolbox-nestjs
cd nestjs-defi-toolbox
```

2. Install dependencies
```bash
npm install
```

3. Create `.env` file based on given example


4. Run database migrations
```bash
npm run typeorm:run-migrations
```

5. Start the application
```bash
# Development
npm run start:dev

# Production
npm run build && npm run start:prod
```


## Directories

```
src/
├── auth/              # Authentication module
├── web3/
│   ├── aave/         # Aave integration
│   ├── uniswap/      # Uniswap integration
│   ├── bridge/       # LiFi bridge integration
│   └── utils/        # Web3 utilities
└── email/           # email service implementation
```


## License
MIT License - see the [LICENSE](LICENSE) file for details
