const hre = require("hardhat");
var sleep = require("sleep");
const fs = require("fs");

async function main() {
  // We get the contract to deploy
  const Number = await hre.ethers.getContractFactory("Number");
  const number = await Number.deploy();

  await number.deployed();

  console.log("Number deployed to:", number.address);

  saveFrontendFiles();

  // wait for 30 seconds before verify
  await sleep.sleep(30);

  await hre.run("verify:verify", {
    address: number.address,
    constructorArguments: [],
  });

  function saveFrontendFiles() {
    const contractsDir = __dirname + "/../src/frontend/contracts";
    if (!fs.existsSync(contractsDir)) {
      fs.mkdirSync(contractsDir);
    }

    fs.writeFileSync(
      contractsDir + "/contract-address.json",
      JSON.stringify(
        {
          Number: number.address,
        },
        undefined,
        2
      )
    );

    const NumberArtifacts = artifacts.readArtifactSync("Number");
    fs.writeFileSync(contractsDir + "/Number.json", JSON.stringify(NumberArtifacts, null, 2));
  }
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
