const {assert, expect, AssertionError} = require("chai");
const {network, deployments, ethers} = require("hardhat");
const {developmentChains} = require("../../helper-hardhat-config");
const {BigNumber} = require("ethers");
const {
  fromWei,
  contractBalance,
  contractCode,
  getBytePackedVar,
  getArrayItem,
  getUint256,
  getMappingItem,
  toWei,
} = require("../../helpers/helpers.js");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Race7 unit tests", function () {
      let mastercopy, proxy, deployer, acc1, acc2, deposit, name, symbol;

      beforeEach(async () => {
        [deployer, acc1, acc2] = await ethers.getSigners();
        const Mastercopy = await ethers.getContractFactory("Mastercopy");
        mastercopy = await Mastercopy.deploy();
        const Proxy = await ethers.getContractFactory("Proxy");
        proxy = await Proxy.deploy();

        /////////////////////////////////////////////////////////////////////
      });

      describe("Slot allocation", function () {
        // No address exists, returns ZERO address
        it("slot 0 allocated for owner() var", async () => {
          expect(await mastercopy.getValue(0)).to.eq(deployer.address);
          expect(await proxy.getValue(0)).to.eq(deployer.address);
        });
        it("slot 1 allocated for counter var", async () => {
          expect(await mastercopy.getValue(1)).to.eq(10);
          expect(await proxy.getValue(1)).to.eq(0);
          await proxy.fallback();
        });
      });
    });
