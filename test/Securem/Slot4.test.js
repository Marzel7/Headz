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
} = require("../../helpers/helpers.js");
const {keccak256} = require("ethers/lib/utils");
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Securem slot4 unit tests", function () {
      let q4, deployer, acc1, acc2, erc721;

      beforeEach(async () => {
        [deployer, acc1, acc2] = await ethers.getSigners();
        const Q4 = await ethers.getContractFactory("Q4");
        q4 = await Q4.deploy();
        /////////////////////////////////////////////////////////////////////
      });

      describe("", function () {
        // No address exists, returns ZERO address
        it("modifier fails, return ZERO address", async () => {
          expect(await q4.getAddress(0)).to.eq(ZERO_ADDRESS);
        });
        // No address exists, returns ZERO address
        it("no modifier, return ZERO address", async () => {
          expect(await q4.getAddressNoModifier(0)).to.eq(ZERO_ADDRESS);
        });
        it("modifier allows permits adding addresses", async () => {
          // set check to true and add address to mapping
          await q4.setCheck(true);
          expect(await q4.check()).to.eq(true);
          await q4.setAddress(1, deployer.address);
          // confirm address is added to mapping and returns address
          expect(await q4.getAddress(1)).to.eq(deployer.address);
        });
      });
    });
