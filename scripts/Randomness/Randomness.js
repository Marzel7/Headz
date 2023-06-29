const {ethers} = require("hardhat");
var sleep = require("sleep");
const fs = require("fs");

let randomness;
let subscriptionId = 4959;
async function main() {
  const Randomness = await ethers.getContractFactory("Randomness");
  console.log("Deploying Randomness...");
  randomness = await Randomness.deploy(subscriptionId);
  await randomness.deployed();
  console.log("Randomness deployed to:", randomness.address);

  // saveFrontendFiles();
  sleep.sleep(60);

  await hre.run("verify:verify", {
    address: randomness.address,
    constructorArguments: [subscriptionId],
  });
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });

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
