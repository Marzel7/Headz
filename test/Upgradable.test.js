const {ethers, upgrades} = require("hardhat");
const {time, loadFixture} = require("@nomicfoundation/hardhat-network-helpers");
const hre = require("hardhat");
const {expect} = require("chai");

describe("Upgradeable", function () {
  let deployer;
  let count = 1;

  async function setUpContractUtils() {
    [deployer] = await ethers.getSigners();

    const Implementation = await ethers.getContractFactory("Implementation");

    const implementation = await upgrades.deployProxy(Implementation, [count], {
      initializer: "initialize",
    });

    await implementation.deployed();

    await implementation.incrementNumber();
    let newCount = await implementation.number();
    let implementationOwner = await implementation.owner();

    // Upgrade contract with new logic
    const Logic = await ethers.getContractFactory("Logic");
    await upgrades.upgradeProxy(implementation.address, Logic);

    await implementation.incrementNumber();
    let upgradedCount = await implementation.number();

    return {
      implementationAdr: implementation.address,
      implementationNumber: newCount,
      implementationOwner,
      upgradedImplementationAdr: implementation.address,
      upgradedImplementationNumber: upgradedCount,
    };
  }
  describe("Implementation Factory test suite", function () {
    it("upgrades implementation contract", async () => {
      const {
        implementationAdr,
        implementationNumber,
        implementationOwner,
        upgradedImplementationAdr,
        upgradedImplementationNumber,
      } = await loadFixture(setUpContractUtils);
      expect(implementationNumber).to.eq(++count); // implementation increments by 1
      expect(implementationOwner).to.be.equal(deployer.address); // owner adr
      expect(upgradedImplementationAdr).to.be.equal(implementationAdr); // implementation adr remain unchanged after update
      expect(upgradedImplementationNumber).to.be.equal(4); // logic implementation increments by 2, uses implementation state memory
    });

    it("updates implementation contract with new owner", async () => {});
  });
});
