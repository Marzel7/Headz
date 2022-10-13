const {ethers, upgrades} = require("hardhat");
const {time, loadFixture} = require("@nomicfoundation/hardhat-network-helpers");
const hre = require("hardhat");
const {expect} = require("chai");
const {inputToConfig} = require("@ethereum-waffle/compiler");

describe("Reentrancy", function () {
  let etherStore, attackStore, attacker, depositVal, hackDepositVal;

  async function setUpContractUtils() {
    [attacker, user1, user2] = await ethers.getSigners();

    depositVal = ethers.utils.parseEther("5");
    hackDepositVal = ethers.utils.parseEther("1");

    const EtherStore = await ethers.getContractFactory("EtherStore");
    etherStore = await EtherStore.deploy();
    await etherStore.deployed();

    const AttackStore = await ethers.getContractFactory("AttackStore");
    attackStore = await AttackStore.deploy(etherStore.address);

    return {
      etherStore,
      etherStoreAdr: etherStore.address,
      attackStore,
      attackStoreAdr: attackStore.address,
      attackerAdr: attacker.address,
    };
  }

  describe("Reentrancy flow", function () {
    it("", async () => {
      const {etherStore, etherStoreAdr, attackStore, attackStoreAdr, attackerAdr} = await loadFixture(
        setUpContractUtils
      );
      // users deposit Eth
      await etherStore.connect(user1).deposit({value: depositVal});
      expect(await etherStore.getBalance()).to.eq(depositVal);

      await etherStore.connect(user2).deposit({value: depositVal});
      expect(await etherStore.getBalance()).to.eq(depositVal.mul(2));

      // AttackStore balance is 0
      let balance = await attackStore.getBalance();
      expect(await attackStore.getBalance()).to.eq(0);
      // Drain funds
      await attackStore.attack({value: hackDepositVal});
      // AttackStore drains EtherStore contract
      expect(await etherStore.getBalance()).to.eq(0);
      // drained funds + deposit
      expect(await attackStore.getBalance()).to.be.gt(depositVal.mul(2));
    });
  });
});
