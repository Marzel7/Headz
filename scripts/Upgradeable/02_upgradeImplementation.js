const {ethers, upgrades} = require("hardhat");

const {ProxyAdr} = require("./contract-address.json");

async function main() {
  const Logic = await ethers.getContractFactory("Logic");
  console.log("Upgrading Proxy to V2...");
  await upgrades.upgradeProxy(ProxyAdr, Logic);
  console.log("Number Contract upgraded successfully");
}

main();
