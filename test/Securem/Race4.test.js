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
  : describe("Race4 unit tests", function () {
      let inSecureumDAO, deployer, acc1, acc2, deposit, name, symbol;

      beforeEach(async () => {
        [deployer, acc1, acc2] = await ethers.getSigners();
        deposit = 1000; // 1 ether
        name = "token";
        symbol = "TKN";
        const InSecureumDAO = await ethers.getContractFactory("Race4X");
        (inSecureumDAO = await InSecureumDAO.deploy()), {gasLimit: 100000};

        /////////////////////////////////////////////////////////////////////
      });

      describe("visibility", function () {
        // No address exists, returns ZERO address
        it("Pure allowed for constants", async () => {
          expect(await inSecureumDAO.getDecimals()).to.eq(8);
        });
        it("View required for non-constants", async () => {
          expect(await inSecureumDAO.getTotalSupply()).to.eq(1000);
        });
      });
    });
