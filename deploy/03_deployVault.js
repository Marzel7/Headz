const {ethers, network} = require("hardhat");
var sleep = require("sleep");
const fs = require("fs");

const {networkConfig, developmentChains, VERIFICATION_BLOCK_CONFIRMATION} = require("../helper-hardhat-config");
const verify = require("../utils/verify.js");
const {toWei} = require("../helpers/helpers");

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy, log} = deployments;
  const {deployer} = await getNamedAccounts();
  const chainId = network.config.chainId;
  const updateInterval = 10;
  let vault;

  const waitBlockConfirmations = developmentChains.includes(network.name) ? 1 : VERIFICATION_BLOCK_CONFIRMATION;

  const arguments = [networkConfig[chainId]["keepersUpdateInterval"]];

  vault = await deploy("Vault", {
    from: deployer,
    args: arguments,
    logs: true,
    waitBlockConfirmation: waitBlockConfirmations,
  });

  // verify the development
  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    log("Verifying....");
    await verify(vault.address, arguments);
  }

  const networkName = network.name == "hardhat" ? "localhost" : network.name;
  log(`Vault deployed on ${networkName} at ${vault.address}`);
};

module.exports.tags = ["all", "vault"];
