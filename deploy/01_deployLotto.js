const {ethers, network} = require("hardhat");
var sleep = require("sleep");
const fs = require("fs");

const {networkConfig, developmentChains, VERIFICATION_BLOCK_CONFIRMATION} = require("../helper-hardhat-config.js");
const {verify} = require("../utils/verify.js");

const FUND_AMOUNT = ethers.utils.parseEther("1"); // 1 Ether, or 1e18 (10^18) Wei

module.exports = async ({getNamedAccounts, deployments}) => {
  const {deploy, log} = deployments;
  const {deployer} = await getNamedAccounts();
  const chainId = network.config.chainId;
  let lotto, vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorV2Mock;

  if (chainId == 31337) {
    // create VFTV2 Subscription
    vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
    vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
    const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
    const transactionReceipt = await transactionResponse.wait();
    subscriptionId = transactionReceipt.events[0].args.subId;
    // Fund the subscription
    await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT);
  } else {
    vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
    subscriptionId = networkConfig[chainId]["subscriptionId"];
  }

  const waitBlockConfirmations = developmentChains.includes(network.name) ? 1 : VERIFICATION_BLOCK_CONFIRMATION;
  log("---------------------------------");
  const arguments = [
    vrfCoordinatorV2Address,
    subscriptionId,
    networkConfig[chainId]["gasLane"],
    networkConfig[chainId]["keepersUpdateInterval"],
    networkConfig[chainId]["entranceFee"],
    networkConfig[chainId]["callbackGasLimit"],
  ];

  lotto = await deploy("Lotto", {
    from: deployer,
    args: arguments,
    logs: true,
    waitBlockConfirmation: waitBlockConfirmations,
  });

  //verify the deployment
  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    log("Veryifying....");
    await verify(lotto.address, arguments);
  }
};

// saveFrontendFiles();
//   sleep.sleep(60);

//   await hre.run("verify:verify", {
//     address: lotto.address,
//     constructorArguments: [1],
//   });
// }

// main()
//   .then(() => process.exit(0))
//   .catch(error => {
//     console.error(error);
//     process.exit(1);
//   });

function saveFrontendFiles() {
  const contractsDir = __dirname + "/../../src/contracts";
  const abisDir = __dirname + "/../../src/contracts/abis";

  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir);
    fs.mkdirSync(abisDir);
  }

  let contractsAdr = [contractsDir, __dirname];
  for (let i = 0; i < contractsAdr.length; i++) {
    fs.writeFileSync(
      contractsAdr[i] + "/contract-address.json",
      JSON.stringify(
        {
          VaultAdr: lotto.address,
        },
        undefined,
        2
      )
    );
  }

  const LottoArt = artifacts.readArtifactSync("Lotto");
  fs.writeFileSync(contractsDir + "/abis/Lotto.json", JSON.stringify(LottoArt, null, 2));
}

// npx hardhat verify --network goerli DEPLOYED_CONTRACT_ADDRESS "Constructor argument 1"
// json errors - delete artifacts, cache folders - npx hardhat clean

module.exports.tags = ["all", "lotto"];
