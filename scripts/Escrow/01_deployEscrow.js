const {ethers, upgrades} = require("hardhat");
//var sleep = require("sleep");
const fs = require("fs");

async function main() {
  const Escrow = await ethers.getContractFactory("Escrow");
  console.log("Deploying Escrow...");
  const escrow = await upgrades.deployProxy(Escrow, [42], {
    initializer: "initialize",
  });
  await escrow.deployed();
  console.log("Calculator deployed to:", escrow.address);
}

main();

//contract deploy address
//0xc0919f8976ab0F525F9825886Ebd5970233f9293

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
