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
  : describe("Securem slot2 unit tests", function () {
      let s5Q3, s5Q6, deployer, acc1, acc2, erc721;

      beforeEach(async () => {
        [deployer, acc1, acc2] = await ethers.getSigners();
        const S5Q3 = await ethers.getContractFactory("S5Q3");
        s5Q3 = await S5Q3.deploy();
        /////////////////////////////////////////////////////////////////////

        const S5Q6 = await ethers.getContractFactory("S5Q6");
        s5Q6 = await S5Q6.deploy();
      });

      describe("Incorrect balance update", function () {
        // No address exists, returns ZERO address
        it("expolit balance update, pass caller as argument", async () => {
          // init balance
          expect(await s5Q6.getTokenBalance(deployer.address)).to.eq(100);
          // transfer, sending msg.sender as argument to exploit contract
          await s5Q6.transferTokens(deployer.address, 100);
          // deployer has doubbled token balance by exploiting contract
          expect(Number(await s5Q6.getTokenBalance(deployer.address))).to.eq(200);
        });
      });
    });
