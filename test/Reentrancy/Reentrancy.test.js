const {ethers, upgrades} = require("hardhat");
const {time, loadFixture} = require("@nomicfoundation/hardhat-network-helpers");
const hre = require("hardhat");
const {expect} = require("chai");
const {inputToConfig} = require("@ethereum-waffle/compiler");

describe("Reentrancy", function () {
  let attacker, depositVal, hackDepositVal;

  async function setUpContractUtils() {
    [attacker, user1, user2] = await ethers.getSigners();

    depositVal = ethers.utils.parseEther("5");
    hackDepositVal = ethers.utils.parseEther("1");

    const EtherStore = await ethers.getContractFactory("EtherStore");
    const etherStore = await EtherStore.deploy();
    await etherStore.deployed();

    const AttackStore = await ethers.getContractFactory("AttackStore");
    const attackStore = await AttackStore.deploy(etherStore.address);

    // Contracts prevent reentrancy
    const EtherStoreProtected = await ethers.getContractFactory("EtherStoreProtected");
    const etherStoreProtected = await EtherStoreProtected.deploy();
    await etherStoreProtected.deployed();

    const AttackProtectedStore = await ethers.getContractFactory("AttackStore");
    const attackProtectedStore = await AttackProtectedStore.deploy(etherStoreProtected.address);
    await attackProtectedStore.deployed();

    const EtherStoreGuarded = await ethers.getContractFactory("EtherStoreGuarded");
    const etherStoreGuarded = await EtherStoreGuarded.deploy();
    await etherStoreGuarded.deployed();

    const AttackProtectedGuarded = await ethers.getContractFactory("AttackStore");
    const attackProtectedGuarded = await AttackProtectedGuarded.deploy(etherStoreGuarded.address);
    await attackProtectedGuarded.deployed();

    return {
      etherStore,
      etherStoreAdr: etherStore.address,
      attackStore,
      attackStoreAdr: attackStore.address,
      etherStoreProtected,
      etherStoreProtectedAdr: etherStoreProtected.address,
      attackProtectedStore,
      attackProtectedStoreAdr: attackProtectedStore.address,
      etherStoreGuarded,
      etherStoreGuardedAdr: etherStoreGuarded.address,
      attackProtectedGuarded,
      attackProtectedGuardedAdr: attackProtectedGuarded.address,
      attackerAdr: attacker.address,
      user1Adr: user1.address,
      user2Adr: user2.address,
    };
  }

  describe("Reentrancy flow", function () {
    it("Reentrancy success", async () => {
      const {etherStore, attackStore} = await loadFixture(setUpContractUtils);
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
    describe("Prevents rentrancy ", function () {
      it("Internal balances updated", async () => {
        const {etherStoreProtected, attackProtectedStore} = await loadFixture(setUpContractUtils);

        // users deposit Eth
        await etherStoreProtected.connect(user1).deposit({value: depositVal});
        expect(await etherStoreProtected.getBalance()).to.eq(depositVal);

        await etherStoreProtected.connect(user2).deposit({value: depositVal});
        expect(await etherStoreProtected.getBalance()).to.eq(depositVal.mul(2));

        // AttackStore balance is 0
        let balance = await attackProtectedStore.getBalance();
        expect(await attackProtectedStore.getBalance()).to.eq(0);

        // Attempt to hack funds
        await expect(attackProtectedStore.attack({value: hackDepositVal})).to.be.revertedWith("");

        // EtherStore balance remains in tact
        expect(await etherStoreProtected.getBalance()).to.eq(depositVal.mul(2));
        // Attacker contract balance is still 0
        expect(await attackProtectedStore.getBalance()).to.eq(0);
      });
    });

    describe("Implements Reentrancy Guard", function () {
      it("Prevents Reentrancy using Guard", async () => {
        const {etherStoreGuarded, attackProtectedGuarded, attackProtectedGuardedAdr, attackerAdr, user1Adr, user2Adr} =
          await loadFixture(setUpContractUtils);
        // users deposit Eth
        await etherStoreGuarded.connect(user1).deposit({value: depositVal});
        expect(await etherStoreGuarded.getBalance()).to.eq(depositVal);

        await etherStoreGuarded.connect(user2).deposit({value: depositVal});
        expect(await etherStoreGuarded.getBalance()).to.eq(depositVal.mul(2));

        // AttackStore balance is 0
        let balance = await attackProtectedGuarded.getBalance();
        expect(await attackProtectedGuarded.getBalance()).to.eq(0);

        // Attempt to hack funds
        await expect(attackProtectedGuarded.attack({value: hackDepositVal})).to.be.revertedWith("");

        // EtherStore balance remains in tact
        expect(await etherStoreGuarded.getBalance()).to.eq(depositVal.mul(2));
        // Attacker contract balance is still 0
        expect(await attackProtectedGuarded.getBalance()).to.eq(0);
        await etherStoreGuarded.connect(user1).deposit({value: depositVal});
        await etherStoreGuarded.connect(user2).deposit({value: depositVal});
      });
    });
  });
});
