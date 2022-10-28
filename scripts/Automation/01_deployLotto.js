// const {ethers, network} = require("hardhat");
// var sleep = require("sleep");
// const fs = require("fs");

// const {networkConfig, developmentChains, VERIFICATION_BLOCK_CONFIRMATION} = require("../../../helper-hardhat-config.js");

// let lotto, vrfCoordinatorV2Address, subscriptionId;
// let interval = 1;

// module.exports = async ({getNamedAccounts, deployments}) => {
//   const {deploy, log} = deployments;
//   const {deployer} = await getNamedAccounts();
//   const chainId = network.config.chainId;

//   console.log("c", chainId);
//   const Lotto = await ethers.getContractFactory("Lotto");
//   console.log("Deploying Lotto...");
//   lotto = await Lotto.deploy(interval);
//   await lotto.deployed();
//   console.log("Lotto deployed to:", lotto.address);
// };

// // saveFrontendFiles();
// //   sleep.sleep(60);

// //   await hre.run("verify:verify", {
// //     address: lotto.address,
// //     constructorArguments: [1],
// //   });
// // }

// // main()
// //   .then(() => process.exit(0))
// //   .catch(error => {
// //     console.error(error);
// //     process.exit(1);
// //   });

// function saveFrontendFiles() {
//   const contractsDir = __dirname + "/../../src/contracts";
//   const abisDir = __dirname + "/../../src/contracts/abis";

//   if (!fs.existsSync(contractsDir)) {
//     fs.mkdirSync(contractsDir);
//     fs.mkdirSync(abisDir);
//   }

//   let contractsAdr = [contractsDir, __dirname];
//   for (let i = 0; i < contractsAdr.length; i++) {
//     fs.writeFileSync(
//       contractsAdr[i] + "/contract-address.json",
//       JSON.stringify(
//         {
//           VaultAdr: lotto.address,
//         },
//         undefined,
//         2
//       )
//     );
//   }

//   const LottoArt = artifacts.readArtifactSync("Lotto");
//   fs.writeFileSync(contractsDir + "/abis/Lotto.json", JSON.stringify(LottoArt, null, 2));
// }

// // npx hardhat verify --network goerli DEPLOYED_CONTRACT_ADDRESS "Constructor argument 1"
// // json errors - delete artifacts, cache folders - npx hardhat clean

// module.exports.tags = ["all", "lotto"];
