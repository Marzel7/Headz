const {deploy} = require("@openzeppelin/hardhat-upgrades/dist/utils");
const {assert, expect} = require("chai");
const {isBytes, resolveProperties} = require("ethers/lib/utils");
const {network, deployments, ethers} = require("hardhat");
const {developmentChains, networkConfig} = require("../../helper-hardhat-config");
const {fromWei, toWei} = require("../../helpers/helpers.js");

// describe("Scheduled Keepers", function () {
//   const interval = 30;
//   const depositVal = ethers.utils.parseEther("1");
//   async function setUpContractUtils() {
//     const Vault = await ethers.getContractFactory("Vault");
//     const vault = await Vault.deploy(interval);
//     await vault.deployed();

//     return {
//       vault,
//       vaultAdr: vault.address,
//     };
//   }

//   describe("Scheduled Keepers", function () {
//     it("deposits", async () => {
//       const {vault} = await loadFixture(setUpContractUtils);
//       // deposit 1 eth
//       await vault.deposit({value: depositVal});
//       // confirm balance
//       expect(await vault.balanceOf()).to.eq(depositVal);
//     });
//     it("checksUpkeep, interval", async () => {
//       const {vault} = await loadFixture(setUpContractUtils);
//       //expect(await vault.checkUpkeep()).to.eq(false);
//       expect(await vault.interval()).to.eq(30);
//     });
//   });
// });

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Vault Unit Tests", function () {
      let vault, vaultContract, deployer, interval, rewardAmount;
      beforeEach(async () => {
        accounts = await ethers.getSigners();
        deployer = accounts[0];
        await deployments.fixture(["vault"]); // deploys modules with the tags 'vault'
        vaultContract = await ethers.getContract("Vault");
        vault = vaultContract.connect(deployer);
        interval = await vault.getInterval();
        rewardAmount = 0.1;

        // send Eth to contract
        await deployer.sendTransaction({
          to: vault.address,
          value: toWei(100),
        });
      });
      describe("constructor", function () {
        it("initializes the Vault correctly", async () => {
          assert.equal(interval, networkConfig[network.config.chainId]["keepersUpdateInterval"]);
          const owner = await vault.owner();
          assert.equal(owner, deployer.address);
        });
      });
      describe("checkUpkeep", async () => {
        it("interval not passed, counter not increased", async () => {
          const counter = await vault.counterBalance();
          const tx = await vault.callStatic.checkUpkeep("0x");
          assert.equal(tx[0], false); // upkeepNeeded, false
          assert.equal(counter, 0);
        });
        it("interval passes, counter updated", async () => {
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
          await network.provider.request({method: "evm_mine", params: []});
          await vault.performUpkeep("0x");
          const counter = await vault.counterBalance();
          assert.equal(counter, 1);
        });

        it("interval passes, funds transferred", async () => {
          const vaultBalance = fromWei(await vault.getBalance());
          let deployerBalance = await deployer.getBalance();

          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
          await network.provider.request({method: "evm_mine", params: []});
          await vault.performUpkeep("0x");
          const counter = await vault.counterBalance();
          const vaultBalanceAfter = fromWei(await vault.getBalance());

          assert.equal(counter, 1);
          assert.equal(vaultBalance, vaultBalanceAfter + rewardAmount);

          deployerBalanceAfter = await deployer.getBalance();
          assert.isAbove(deployerBalanceAfter, deployerBalance);
        });
      });
    });
