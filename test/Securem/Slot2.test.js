const {assert, expect, AssertionError} = require("chai");
const {network, deployments, ethers} = require("hardhat");
const {developmentChains} = require("../../helper-hardhat-config");
const {fromWei, contractBalance, contractCode} = require("../../helpers/helpers.js");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Securem slot2 unit tests", function () {
      let slot2Contract, slot2ExternalCall, contractA, contractB, deployer, acc1, acc2;

      beforeEach(async () => {
        [deployer, acc1, acc2] = await ethers.getSigners();
        const Slot2ExternalCall = await ethers.getContractFactory("Slot2ExternalCall");
        slot2ExternalCall = await Slot2ExternalCall.deploy();
        const Slot2Contract = await ethers.getContractFactory("Slot2");
        slot2Contract = await Slot2Contract.deploy(slot2ExternalCall.address);
        /////////////////////////////////////////////////////////////////////
        const ContractA = await ethers.getContractFactory("A");
        contractA = await ContractA.deploy();
        const ContractB = await ethers.getContractFactory("B");
        contractB = await ContractB.deploy();
      });

      describe("constructor", function () {
        it("initializes the contract", async () => {
          let myVar = await slot2Contract.varName();
          assert.equal(myVar, 10);
          let tx = await slot2Contract.removeVar();
          await tx.wait(1);
          // Should be reset to 0
          myVar = await slot2Contract.varName();
          assert.equal(myVar, 0);
        });
        it("External calls", async () => {
          let sender = await slot2Contract.connect(deployer).getSendingAddress();
          // sender is calling contract
          assert.equal(sender, slot2Contract.address);

          let origin = await slot2Contract.getOriginAddress();
          // origin is EOA caller
          assert.equal(origin, deployer.address);
        });

        it("reverts and aborts state changes", async () => {
          await expect(slot2Contract.increaseInteger()).to.be.revertedWith("caller is not a contract");
          // varname value has not changed after revert
          assert.equal(await slot2Contract.varName(), 10);
        });

        it("returns a successful delegatecall", async () => {
          let tx = await contractB.destroy();

          expect(await ethers.provider.getCode(contractB.address)).to.equal("0x");
          // The low-level functions call, delegatecall and staticcall
          // return true as their first return value if the account called is non-existent,
          // as part of the design of the EVM
          tx = await contractA.setVars(contractB.address, 10);
          assert(await contractA.num(), 10);
        });
      });
    });
