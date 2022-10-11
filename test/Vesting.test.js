const {ethers, upgrades} = require("hardhat");
const {time, loadFixture} = require("@nomicfoundation/hardhat-network-helpers");
const hre = require("hardhat");
const {expect} = require("chai");

const ERC20 = require("@openzeppelin/contracts/build/contracts/ERC20.json");
const IERC20 = new ethers.utils.Interface(JSON.stringify(ERC20.abi));

describe("Vesting", function () {
  let daiContract, vestingContract, totalSupply, owner, addr1;

  async function setUpContractUtils() {
    [owner, addr1] = await ethers.getSigners();
    const Dai = await ethers.getContractFactory("DaiToken");
    daiContract = await Dai.deploy("TOKEN", "DAI");
    await daiContract.deployed();

    const Vesting = await ethers.getContractFactory("Vesting");
    vestingContract = await Vesting.deploy(daiContract.address);
    await vestingContract.deployed();

    totalSupply = await daiContract.totalSupply();
    // approve vesting contract to spend Dai
    await daiContract.approve(vestingContract.address, totalSupply);

    return {
      daiContract,
      daiAdr: daiContract.address,
      vestingContract,
      vestingAdr: vestingContract.address,
      ownerAdr: owner.address,
      addr1,
    };
  }
  describe("", function () {
    it("Dai test suite", async () => {
      const {daiContract, ownerAdr} = await loadFixture(setUpContractUtils);
      expect(await daiContract.balanceOf(ownerAdr)).to.eq(totalSupply);
    });

    it("Vesting test suit", async () => {
      const {vestingContract, ownerAdr} = await loadFixture(setUpContractUtils);
      const currentBlock = await vestingContract.currentBlock();
      // TODO - expiration blocks in future
      const expirationBlock = 1;

      await vestingContract.lockFunds(currentBlock - expirationBlock, totalSupply);
      expect(await vestingContract.owner()).to.eq(ownerAdr);
      expect(await vestingContract.lockedAmount()).to.eq(totalSupply);
      expect(await vestingContract.isLocked()).to.eq(true);
      expect(await vestingContract.isClaimed()).to.eq(false);
      expect(await daiContract.balanceOf(ownerAdr)).to.eq(0);

      // Withdraw funds
      await vestingContract.withdraw();
      expect(await daiContract.balanceOf(ownerAdr)).to.eq(totalSupply);
      expect(await vestingContract.lockedAmount()).to.eq(0);
      expect(await vestingContract.isLocked()).to.eq(true);
      expect(await vestingContract.isClaimed()).to.eq(true);
    });
    it("Executes vesting transaction", async () => {
      const {vestingContract, ownerAdr, daiAdr, vestingAdr} = await loadFixture(setUpContractUtils);
      const currentBlock = await vestingContract.currentBlock();
      // TODO - expiration blocks in future
      const expirationBlock = 1;
      await vestingContract.lockFunds(currentBlock - expirationBlock, totalSupply);

      const signature = "transfer(address, uint256)";
      const parameters = [ownerAdr, totalSupply];
      const target = [daiAdr];

      // EncodeData
      const encodedData = IERC20.encodeFunctionData(signature, parameters);
      await vestingContract.executeTransaction(target, [encodedData]);

      expect(await daiContract.balanceOf(vestingAdr)).to.eq(0);
      expect(await daiContract.balanceOf(ownerAdr)).to.eq(totalSupply);
    });
  });
});
