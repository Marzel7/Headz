const {ethers, upgrades} = require("hardhat");
const {time, loadFixture} = require("@nomicfoundation/hardhat-network-helpers");
const hre = require("hardhat");
const {expect} = require("chai");

describe("Scheduled Keepers", function () {
  const interval = 30;
  const depositVal = ethers.utils.parseEther("1");
  async function setUpContractUtils() {
    const Vault = await ethers.getContractFactory("Vault");
    const vault = await Vault.deploy(interval);
    await vault.deployed();

    return {
      vault,
      vaultAdr: vault.address,
    };
  }

  describe("Scheduled Keepers", function () {
    it("deposits", async () => {
      const {vault} = await loadFixture(setUpContractUtils);
      // deposit 1 eth
      await vault.deposit({value: depositVal});
      // confirm balance
      expect(await vault.balanceOf()).to.eq(depositVal);
    });
    it("checksUpkeep, interval", async () => {
      const {vault} = await loadFixture(setUpContractUtils);
      //expect(await vault.checkUpkeep()).to.eq(false);
      expect(await vault.interval()).to.eq(1);
    });
  });
});
