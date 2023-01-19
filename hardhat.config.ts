import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv"; // see https://github.com/motdotla/dotenv#how-do-i-use-dotenv-with-import
dotenv.config();

const config: HardhatUserConfig = {
  networks: {
    polygonMumbai: {
      url: `${process.env.ALCHEMY_RPC_URL}`,
      accounts: [`${process.env.NIKO_DEPLOYER}`],
    },
    // polygon: {
    //   url: `${process.env.ALCHEMY_MAINNET_RPC_URL}`,
    //   accounts: [`${process.env.NIKO_DEPLOYER}`],
    // },
    hardhat: {
      gas: "auto",
      gasPrice: "auto",
    },
  },
  etherscan: {
    apiKey: {
      polygonMumbai: `${process.env.POLYGONSAN_API_KEY}`,
      polygon: `${process.env.POLYGONSAN_API_KEY}`,
    },
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },

  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
};

export default config;
