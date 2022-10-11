const {ethers, upgrades} = require("hardhat");
const fs = require("fs");
const {FormatTypes} = require("ethers/lib/utils");
const initialNumber = 1;

async function main() {
  const Implementation = await ethers.getContractFactory("Implementation");

  const implementation = await upgrades.deployProxy(Implementation, [initialNumber], {
    initializer: "initialize",
    unsafeAllow: ["delegatecall"],
  });

  console.log(("Proxy deployed to:", implementation.address));

  saveFrontendFiles(implementation);
}

main();

function saveFrontendFiles(implementation) {
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
          ProxyAdr: implementation.address,
        },
        undefined,
        2
      )
    );
  }

  const ImplementationArt = artifacts.readArtifactSync("Implementation");
  fs.writeFileSync(contractsDir + "/abis/Implementation.json", JSON.stringify(ImplementationArt, null, 2));
}
