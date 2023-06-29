const {ethers, network} = require("hardhat");

const {networkConfig, developmentChains, VERIFICATION_BLOCK_CONFIRMATION} = require("../../helper-hardhat-config");
const verify = require("../../utils/verify.js");
const {toWei} = require("../../helpers/helpers");

module.exports = async ({getNamedAccounts, deployments}) => {
  const signers = await ethers.getSigners();
  const signer = signers[0];
  const {deploy, log} = deployments;
  const {deployer} = await getNamedAccounts();
  const chainId = network.config.chainId;
  let vault;

  const waitBlockConfirmations = developmentChains.includes(network.name) ? 1 : VERIFICATION_BLOCK_CONFIRMATION;

  const arguments = [networkConfig[chainId]["keepersUpdateInterval"]];

  vault = await deploy("Vault", {
    from: deployer,
    args: arguments,
    log: true,
    waitBlockConfirmation: waitBlockConfirmations,
  });

  // send Eth to contract on deployment
  await signer.sendTransaction({
    to: vault.address,
    value: toWei(100),
  });
  // verify the development
  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    log("Verifying....");
    await verify(vault.address, arguments);
  }

  const networkName = network.name == "hardhat" ? "localhost" : network.name;
  // log(`Vault deployed on ${networkName} at ${vault.address}`);
};

module.exports.tags = ["all", "vault"];
