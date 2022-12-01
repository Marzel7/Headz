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
  : describe("Securem slot7 unit tests", function () {
      let inSecureumDAO, deployer, acc1, acc2, deposit;

      beforeEach(async () => {
        [deployer, acc1, acc2] = await ethers.getSigners();
        deposit = 1000; // 1 ether
        const InSecureumDAO = await ethers.getContractFactory("InSecureumDAO");
        (inSecureumDAO = await InSecureumDAO.deploy(deployer.address)), {gasLimit: 100000};

        /////////////////////////////////////////////////////////////////////
      });

      describe("Incorrect balance update", function () {
        // No address exists, returns ZERO address
        it("expolit balance update, pass caller as argument", async () => {
          // Join DAO and confirm membership
          await inSecureumDAO.join({value: deposit});
          await inSecureumDAO.connect(acc1).join({value: deposit});
          expect(await inSecureumDAO.isMember(deployer.address)).to.eq(true);
          expect(await inSecureumDAO.isMember(acc1.address)).to.eq(true);
          await inSecureumDAO.removeAllMembers();
          expect(await inSecureumDAO.isMember(deployer.address)).to.eq(false);
          expect(await inSecureumDAO.isMember(acc1.address)).to.eq(true);
        });
      });
    });
