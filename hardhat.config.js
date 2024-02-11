require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */

require("dotenv").config();
const {
  ARBITRUM_ALCHEMY_GOERLI,
  ARBITRUM_PRIVATE_KEY,
  SEPOLIA_ALCHEMY,
  SEPOLIA_PRIVATE_KEY
} = process.env;

module.exports = {
  solidity: "0.8.19",
  networks : {
    arbitrumGoerli: {
      url: ARBITRUM_ALCHEMY_GOERLI,
      chainId: 421613,
      accounts: [ ARBITRUM_PRIVATE_KEY || '']
    },
    sepolia: {
      url: SEPOLIA_ALCHEMY,
      chainId: 11155111,
      accounts: [ SEPOLIA_PRIVATE_KEY || '']
    }
  }
};
