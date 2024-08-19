require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("hardhat-contract-sizer");
require("dotenv").config();

const {
  WALLET_PRIVATE_KEY,
  ETHEREUM_ARCHIVAL_RPC,
  ETHEREUM_SCAN_API_KEY,
  // ETHEREUM_RPC_URL,
  // ETHEREUM_CHAIN_ID,
  SEPOLIA_ARCHIVAL_RPC,
  SEPOLIA_SCAN_API_KEY,
  POLYGON_ARCHIVAL_RPC,
  POLYGON_SCAN_API_KEY,
  AMOY_ARCHIVAL_RPC,
  AMOY_SCAN_API_KEY,
} = process.env;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.17",
      },
    ],
    settings: {
      optimizer: {
        enabled: false,
        viaIR: true,
        runs: 200,
        details: {
          yul: true,
        },
      },
    },
  },
  networks: {
    hardhat: {
      forking: {
        url: "https://rpc.ankr.com/eth",
        ignoreUnknownTxType: true,
        blockNumber: 18314577,
      },
      chainId: 1,
      accounts: {
        // privateKey: WALLET_PRIVATE_KEY,
        balance: "0x1bc16d674ec80000",
      },
      initialBaseFeePerGas: 0,
      gasPrice: 0,
      gas: 30000000,
    },
    ethereum: {
      url: `${ETHEREUM_ARCHIVAL_RPC}`,
      accounts: [
        `${
          WALLET_PRIVATE_KEY ||
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        }`,
      ],
    },
    sepolia: {
      url: `${SEPOLIA_ARCHIVAL_RPC}`,
      accounts: [
        `${
          WALLET_PRIVATE_KEY ||
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        }`,
      ],
    },

    polygon: {
      url: `${POLYGON_ARCHIVAL_RPC}`,
      accounts: [
        `${
          WALLET_PRIVATE_KEY ||
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        }`,
      ],
    },
    amoy: {
      url: `${AMOY_ARCHIVAL_RPC}`,
      chainId: 80002,
      accounts: [
        `${
          WALLET_PRIVATE_KEY ||
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        }`,
      ],
    },
  },
  gasReporter: {
    enabled: false,
    coinmarketcap: "1d8cfd2b-c9b6-4884-a5bb-1f0e033b146c",
    outputFile: "gas-report-eth.txt",
    noColors: true,
    currency: "USD",
    excludeContracts: ["Mock/", "Token/"],
  },
  etherscan: {
    apiKey: {
      ethereum: ETHEREUM_SCAN_API_KEY,
      sepolia: SEPOLIA_SCAN_API_KEY,
      polygon: POLYGON_SCAN_API_KEY,
      amoy: AMOY_SCAN_API_KEY,
    },
  },
};
