require("@nomiclabs/hardhat-waffle");
require("dotenv").config();
require("@nomiclabs/hardhat-etherscan");
require("hardhat-gas-reporter");
require("@openzeppelin/hardhat-upgrades");
// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: "0.8.4",
  defaultNetwork: "hardhat",
  networks: {
    localhost: {},
    forkingMainnet: {
      url: "http://127.0.0.1:8545",
      forking: {
        url: process.env.FORKED_MAINNET_RPC,
        blockNumber: 15058412,
      },
    },
    hardhat: {
      chainId: 1337,
    },
    rinkeby: {
      url: process.env.RINKEBY_RPC,
      accounts: [process.env.PRIVATE_KEY],
    },
    polygon_mumbai: {
      url: process.env.POLYGON_MUMBAI_RPC,
      accounts: [process.env.PRIVATE_KEY],
    },
    goerli: {
      url: process.env.GOERLI_RPC,
      accounts: [process.env.PRIVATE_KEY],
    },
    // depreciated networks
    // kovan: {
    //   url: process.env.KOVAN_RPC,
    //   accounts: [process.env.PRIVATE_KEY]
    // },
    // ropsten: {
    //   url: process.env.ROPSTEN_RPC,
    //   accounts: [process.env.PRIVATE_KEY]
    //},
  },
  // paths: {
  //   artifacts: "./src/frontend/contracts/artifacts",
  // },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
