const {ethers, network} = require("hardhat");

const {developmentChains, VERIFICATION_BLOCK_CONFIRMATION} = require("../../helper-hardhat-config");
const verify = require("../../utils/verify.js");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy, log} = deployments;
  const {deployer} = await getNamedAccounts();

  const maxBatchSize = 2;
  const collectionSize = 100;
  const amountForAuctionAndDev = 10;
  const amountForDevs = 10;
  let ikuza;

  const waitBlockConfirmations = developmentChains.includes(network.name) ? 1 : VERIFICATION_BLOCK_CONFIRMATION;
  log("--------------------------------------------------");
  const arguments = [maxBatchSize, collectionSize, amountForAuctionAndDev, amountForDevs];

  ikuza = await deploy("Ikuza", {
    from: deployer,
    log: true,
    args: arguments,
    waitBlockConfirmation: waitBlockConfirmations,
    gasLimit: 4000000,
  });

  // verify the development
  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    log("Verifying....");
    await verify(ikuza.address, arguments);
  }
  const networkName = network.name == "hardhat" ? "localhost" : network.name;
  // log(`Ikuza deployed on ${networkName} at ${ikuza.address}`);
};

module.exports.tags = ["all", "ikuza"];
