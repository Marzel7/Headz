const {ethers, upgrades} = require("hardhat");
const {time, loadFixture} = require("@nomicfoundation/hardhat-network-helpers");
const hre = require("hardhat");
const {expect} = require("chai");
const {inputToConfig} = require("@ethereum-waffle/compiler");
const {BigNumber} = require("ethers");

const toWei = value => ethers.utils.parseEther(value.toString());
const fromWei = value => parseInt(value.toString()) / 1e18;

describe("Lotto", function () {
  let lotto, owner, ply1, ply2, ply3;
  const depositVal = toWei("0.01");

  const interval = 1;
  const setUpContractUtils = async () => {
    [owner, ply1, ply2, ply3] = await ethers.getSigners();
    const Lotto = await ethers.getContractFactory("Lotto");
    lotto = await Lotto.deploy(interval);
    await lotto.deployed();

    return {
      lotto,
      lottoAdr: lotto.address,
      ownerAdr: owner.address,
      ply1Adr: ply1.address,
      ply2Adr: ply2.address,
      ply3Adr: ply3.address,
    };
  };

  describe("Lotto flow", function () {
    it("Deploys - Success", async () => {
      const {lotto, ownerAdr} = await loadFixture(setUpContractUtils);
      expect(await lotto.owner()).to.eq(ownerAdr);
      expect(await lotto.getBalance()).to.eq(0);
    });
    it("Registers - Success", async () => {
      const {lotto} = await loadFixture(setUpContractUtils);
      await lotto.register({value: depositVal});
      let bal = fromWei(await lotto.getBalance());
      // 0.01 eth balance
      expect(bal).to.eq(0.01);
    });
  });
});
