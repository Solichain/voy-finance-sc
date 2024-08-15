require("@nomicfoundation/hardhat-toolbox");
require("@openzeppelin/hardhat-upgrades");
require("hardhat-contract-sizer");
require("dotenv").config();

const {
  MAINNET_DEPLOYER_PRIVATE_KEY,
  TESTNET_PRIVATE_KEY,
  POLYGON_ARCHIVAL_RPC,
  // POLYGON_SCAN_API_KEY,
  // POLYGON_RPC_URL,
  // POLYGON_CHAIN_ID,
  AMOY_ARCHIVAL_RPC,
  // AMOY_SCAN_API_KEY,
  // AMOY_RPC_URL,
  // AMOY_CHAIN_ID,
  SEPOLIA_ARCHIVAL_RPC,
} = process.env;

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.17",
      },
      // {
      //   version: "^0.8.0",
      // },
    ],
    // settings: {
    //   optimizer: {
    //     enabled: false,
    //     viaIR: true,
    //     runs: 200,
    //     details: {
    //       yul: true,
    //     },
    //   },
    // },
  },
  networks: {
    // hardhat: {
    //   forking: {
    //     url: process.env.POLYGON_RPC_URL || "https://www.ankr.com/rpc/polygon/",
    //     ignoreUnknownTxType: true,
    //     // blockNumber: 18314577,
    //   },
    //   chainId: Number(process.env.POLYGON_CHAIN_ID) || 137,
    //   accounts: {
    //     privateKey:
    //       "fb2f8928200363aba316b62595b35133a4b98acdb82e58570fba1f93a461d456",
    //     balance: 2,
    //     // mnemonic:
    //     //   "dice shove sheriff police boss indoor hospital vivid tenant method game matter",
    //     // path: "m/44'/60'/0'/0",
    //     // initialIndex: 0,
    //   },
    //   initialBaseFeePerGas: 0,
    //   gasPrice: 0,
    //   gas: 30000000,
    // },
    // polygon: {
    //   url: `${POLYGON_ARCHIVAL_RPC}`,
    //   accounts: [
    //     `${
    //       MAINNET_DEPLOYER_PRIVATE_KEY ||
    //       "0x0000000000000000000000000000000000000000000000000000000000000000"
    //     }`,
    //   ],
    // },
    // amoy: {
    //   url: `${AMOY_ARCHIVAL_RPC}`,
    //   accounts: [
    //     `${
    //       MAINNET_DEPLOYER_PRIVATE_KEY ||
    //       "0x0000000000000000000000000000000000000000000000000000000000000000"
    //     }`,
    //   ],
    // },
    sepolia: {
      url: `${SEPOLIA_ARCHIVAL_RPC}`,
      accounts: [
        `${
          TESTNET_PRIVATE_KEY ||
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        }`,
      ],
    },
    // mainnet: {
    //   url: `${MAINNET_ARCHIVAL_RPC}`,
    //   accounts: [
    //     `${
    //       MAINNET_DEPLOYER_PRIVATE_KEY ||
    //       "0x0000000000000000000000000000000000000000000000000000000000000000"
    //     }`,
    //   ],
    // },
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
      // mainnet: process.env.ETHERSCAN_API_KEY || "",
      sepolia: process.env.SEPOLIA_SCAN_API_KEY || "",
      // polygon: process.env.POLYGONSCAN_API_KEY || "",
      // mumbai: process.env.POLYGONSCAN_API_KEY || "",
    },
  },
};
