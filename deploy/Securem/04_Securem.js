const {ethers, network} = require("hardhat");

const {developmentChains, VERIFICATION_BLOCK_CONFIRMATION} = require("../../helper-hardhat-config");
const {toWei} = require("../../helpers/helpers");
const verify = require("../../utils/verify.js");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy, log} = deployments;
  const {deployer, player} = await getNamedAccounts();
  const signers = await ethers.getSigners();
  const signer = signers[0];

  let selfDestruct;

  const waitBlockConfirmations = developmentChains.includes(network.name) ? 1 : VERIFICATION_BLOCK_CONFIRMATION;
  log("--------------------------------------------------");
  const arguments = [player];

  selfDestruct = await deploy("SelfDestruct", {
    from: deployer,
    log: true,
    waitBlockConfirmation: waitBlockConfirmations,
    gasLimit: 4000000,
  });

  // transfer funds to contract
  await signer.sendTransaction({to: selfDestruct.address, value: toWei("10"), gasLimit: 4000000});

  // verify the development
  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    log("Verifying....");
    await verify(selfDestruct.address, arguments);
  }
  const networkName = network.name == "hardhat" ? "localhost" : network.name;
};

module.exports.tags = ["securem"];
