const {ethers, upgrades} = require("hardhat");
const {time, loadFixture} = require("@nomicfoundation/hardhat-network-helpers");
const hre = require("hardhat");
const {expect} = require("chai");

describe("Upgradeable", function () {
  let deployer, implementation, updradedInstance;
  let count = 0;

  async function setUpContractUtils() {
    [deployer] = await ethers.getSigners();

    // deploy implementation
    const Implementation = await ethers.getContractFactory("Implementation");
    implementation = await upgrades.deployProxy(Implementation, [count], {
      initializer: "initialize",
    });
    await implementation.deployed();
    let implementationInstance = await ethers.getContractAt("Implementation", implementation.address, deployer);

    return {
      implementationInstance,
    };
  }
  describe("Implementation Factory test suite", function () {
    it("increments implementation contract", async () => {
      const {implementationInstance} = await loadFixture(setUpContractUtils);
      expect(await implementationInstance.number()).to.eq(0); // inits to zero
      await implementationInstance.incrementNumber();
      expect(await implementationInstance.number()).to.eq(1); //
      expect(await implementationInstance.owner()).to.eq(deployer.address); // owner adr
    });

    it("increments upgraded contract", async () => {
      // Upgrade contract with new logic
      const Logic = await ethers.getContractFactory("Logic");
      let updradedInstance = await upgrades.upgradeProxy(implementation.address, Logic);
      expect(await updradedInstance.number()).to.eq(1);
      await updradedInstance.incrementNumber();
      expect(await updradedInstance.number()).to.eq(3); // increments by 2
      expect(await updradedInstance.owner()).to.eq(deployer.address); // owner adr
    });
  });
});
