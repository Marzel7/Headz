const {time, loadFixture} = require("@nomicfoundation/hardhat-network-helpers");
const {anyValue} = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const {expect} = require("chai");
const hre = require("hardhat");
const {ethers} = require("hardhat");
const {inputToConfig} = require("@ethereum-waffle/compiler");

describe("CrowdFunding", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.

  async function setUpContractUtils() {
    const ONE_YEAR_IN_SEC = 365 * 53 * 7 * 24 * 60 * 60;
    const ONE_ETH = 100000000000000000;

    const deposit = ONE_ETH * 0.001;
    const amountToDeposit = ethers.utils.parseEther("0.01");
    const futureTime = (await time.latest()) + ONE_YEAR_IN_SEC;

    let fundingId = "bafybeibhwfzx6oo5rymsxmkdxpmkfwyvbjrrwcl7cekmbzlupmp5ypkyfi";
    let milestoneCID = "bafybeibhwfzx6oo5rymsxmkdxpmkfwyvbjrrwcl7cekmbzlupmp5ypkyfi";
    // Contracts are deployed using the first signer/account by default
    const [owner, otherAccount, someOtherAccount, accountOne, accountTwo, accountThree, accountFour] =
      await ethers.getSigners();

    //deploy the contracts here
    const CrowdFundingImplementation = await hre.ethers.getContractFactory("CrowdFundingContract");
    const crowdFundingImplementation = await CrowdFundingImplementation.deploy();
    await crowdFundingImplementation.deployed();

    // deploy factory contract
    const CrowdFundingFactory = await hre.ethers.getContractFactory("CrowdFundingFactory");
    const crowdFundingFactory = await CrowdFundingFactory.deploy(crowdFundingImplementation.address);
    await crowdFundingFactory.deployed();

    let tx = await crowdFundingFactory
      .connect(otherAccount)
      .createCrowdFundingContract(fundingId, deposit, futureTime, {value: deposit});
    let wait = await tx.wait();

    const cloneAddress = wait.events[1].args.cloneAddress;

    // load the clone
    let instanceOne = await hre.ethers.getContractAt("CrowdFundingContract", cloneAddress, otherAccount);

    let txnTwo = await crowdFundingFactory
      .connect(otherAccount)
      .createCrowdFundingContract(fundingId, deposit, futureTime);
    let waitTwo = await txnTwo.wait();
    const cloneAddressTwo = waitTwo.events[1].args.cloneAddress;

    // load the clone
    let instanceTwo = await hre.ethers.getContractAt("CrowdFundingContract", cloneAddressTwo, someOtherAccount);

    return {
      futureTime,
      deposit,
      owner,
      otherAccount,
      someOtherAccount,
      contractFactory: crowdFundingFactory,
      fundingId,
      amountToDeposit,
      instanceOne,
      instanceTwo,
      milestoneCID,
      accountOne,
      accountTwo,
      accountThree,
      accountFour,
    };
  }
  describe("Contract Factory test suite", function () {
    it("should creat a clone contract and create a bew campaign", async () => {
      const {contractFactory, otherAccount, deposit, futureTime, fundingId} = await loadFixture(setUpContractUtils);

      const txn = await contractFactory
        .connect(otherAccount)
        .createCrowdFundingContract(fundingId, deposit, futureTime, {value: deposit});

      let wait = await txn.wait();
      expect(wait.events[1].args.cloneAddress).to.exist;
    });

    it("Should show deployed contracts as two", async function () {
      const {contractFactory} = await loadFixture(setUpContractUtils);
      const deployedContracts = await contractFactory.deployedContracts();
      expect(+deployedContracts.length).to.be.equal(2);
    });
    it("Should only allow the owner to withdraw", async () => {
      const {contractFactory, owner} = await loadFixture(setUpContractUtils);
      const beforeBalance = await hre.ethers.provider.getBalance(owner.address);
      await contractFactory.connect(owner).withdrawFunds();
      const balanceAfter = await hre.ethers.provider.getBalance(owner.address);
      expect(+balanceAfter.toString()).to.be.gt(+beforeBalance.toString());
    });
  });
});
