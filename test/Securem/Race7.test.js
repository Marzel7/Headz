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
      let race7, race7Attack, deployer, acc1, acc2, deposit, name, symbol;

      beforeEach(async () => {
        [deployer, acc1, acc2] = await ethers.getSigners();
        deposit = toWei(100); // 10 ether
        name = "token";
        symbol = "TKN";
        const MAX_APES = 1000;
        const SALE_START = 1;
        const Race7 = await ethers.getContractFactory("Race7");
        (race7 = await Race7.deploy(name, symbol, MAX_APES, SALE_START)), {gasLimit: 100000};

        const Race7Attack = await ethers.getContractFactory("Race7x");
        (race7Attack = await Race7Attack.deploy(race7.address)), {gasLimit: 100000};

        /////////////////////////////////////////////////////////////////////
      });

      describe("Mint Reserves, exceed MAX_APES", function () {
        // No address exists, returns ZERO address
        it("Pure allowed for constants", async () => {
          expect(await race7.owner()).to.eq(deployer.address);
          // mint 30 Apes from reserves
          await race7.reserveApes();
          expect(await race7.totalSupply()).to.eq(30);
          // mint another 30 Apes from reserves - this vulnerability exists because MAX_APES is bypassed
          await race7.reserveApes();
          expect(await race7.totalSupply()).to.eq(60);
          // .. minting could continue until type(uint256).max
        });
      });

      describe("Attacking contract", function () {
        it("uses reentrancy to exceed MAX_APES per tx", async () => {
          // 0 Apes minted to start
          expect(await race7.totalSupply()).to.eq(0);
          await race7.flipSaleState();
          await race7Attack.mint({value: deposit});
          // 30 Apes minted bypassing MAX_APES per tx
          expect(await race7.totalSupply()).to.eq(31);
        });
      });
    });
