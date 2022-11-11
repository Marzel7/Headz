const {deploy} = require("@openzeppelin/hardhat-upgrades/dist/utils");
const {assert, expect} = require("chai");
const {isBytes, resolveProperties} = require("ethers/lib/utils");
const {network, deployments, ethers} = require("hardhat");
const {developmentChains, networkConfig} = require("../../helper-hardhat-config");
const {fromWei, toWei} = require("../../helpers/helpers.js");

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
      });
      describe("constructor", function () {
        it("initializes the Vault correctly", async () => {
          assert.equal(interval, networkConfig[network.config.chainId]["keepersUpdateInterval"]);
          const owner = await vault.owner();
          const balance = await vault.getBalance();
          assert.equal(owner, deployer.address);
          assert.equal(fromWei(balance), 100); // balance upon deployment
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
