const {assert, expect, AssertionError} = require("chai");
const {isBytes, resolveProperties} = require("ethers/lib/utils");
const {network, deployments, ethers} = require("hardhat");
const {developmentChains, networkConfig} = require("../../helper-hardhat-config");
const {fromWei, toWei, contractBalance, contractCode} = require("../../helpers/helpers.js");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Securem unit tests", function () {
      let destroyContract, deployer, acc1, acc2;
      const deployedEthBalance = 10;
      beforeEach(async () => {
        [deployer, acc1, acc2] = await ethers.getSigners();
        await deployments.fixture(["securem"]);
        destroyContract = await ethers.getContract("SelfDestruct");
      });

      describe("constructor", function () {
        it("initializes the contract", async () => {
          const balance = await contractBalance(destroyContract.address); // Deployed balance
          assert.equal(Number(fromWei(balance)), deployedEthBalance);
        });
        it("calls self destruct", async () => {
          let balance = Number(fromWei(await contractBalance(deployer.address))); // Deployed balance

          await destroyContract.destroy(deployer.address);
          let newbalance = Number(fromWei(await contractBalance(deployer.address))); // Deployed balance

          // Contract is destroyed and balance is forwarded to address argument
          const gasAllowance = deployedEthBalance * 0.99;
          assert.equal(await contractBalance(destroyContract.address), 0);
          assert.isAbove(newbalance, balance + gasAllowance);
        });

        it("cannot be called after selfdestruct", async () => {
          // Contract has byteCode
          const contractbyteCode = await contractCode(destroyContract.address);
          assert.notEqual(contractbyteCode, "0x");

          await destroyContract.destroy(deployer.address);
          assert.equal(await contractBalance(destroyContract.address), 0);
          // Contract has no byteCode
          expect(await ethers.provider.getCode(destroyContract.address)).to.equal("0x");
        });
      });
    });
