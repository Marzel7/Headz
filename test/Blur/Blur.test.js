const {assert, expect, AssertionError} = require("chai");
const {network, deployments, ethers} = require("hardhat");
const {developmentChains} = require("../../helper-hardhat-config");
const {BigNumber, parseEther} = require("ethers");
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
const {getContractFactory} = require("@nomiclabs/hardhat-ethers/types");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("BlurExchange", function () {
      let blurExchange, executionDelegate, collection, weth, owner, buyer, seller, delegate, deposit, sell, buy;

      beforeEach(async () => {
        [owner, delegate, buyer, seller, delegate] = await ethers.getSigners();

        const WETH = await ethers.getContractFactory("WETH");
        weth = await WETH.deploy();

        const Collection = await ethers.getContractFactory("Collection");
        collection = await Collection.deploy();

        const ExecutionDelegate = await ethers.getContractFactory("ExecutionDelegate");
        executionDelegate = await ExecutionDelegate.deploy();

        const BlurExchange = await ethers.getContractFactory("BlurExchange");
        blurExchange = await BlurExchange.deploy(executionDelegate.address, weth.address);

        await collection.connect(owner).approve(blurExchange.address, 1);
        await collection.transferFrom(owner.address, seller.address, 1);
        await collection.connect(seller).approve(executionDelegate.address, 1);

        /////////////////////////////////////////////////////////////////////
      });

      describe("WETH deployment", function () {
        it("inspects total supply", async () => {
          expect(await weth.totalSupply()).to.eq(1000);
        });
      });
      describe("ERC721 collection", function () {
        it("inspects tokenId owner", async () => {
          expect(await collection.ownerOf(1)).to.eq(seller.address);
        });
      });
      describe("Blur exchange delegates transfers to executionDelegate", function () {
        it("confirms exchange owner", async () => {
          expect(await blurExchange.owner()).to.eq(owner.address);
        });
        it("reverts when executionDelegate contract hasn't approved Blur exchange", async () => {
          // ExecutionDelegate requires Blur exchange to be approved for transfers
          await expect(
            blurExchange.execute(collection.address, buyer.address, seller.address, 1, 1)
          ).to.be.revertedWith("Contract is not approved to make transfers");
        });
        it("only owner can call executionDelegate approveContract", async () => {
          await expect(executionDelegate.connect(seller).approveContract(blurExchange.address)).to.be.revertedWith(
            "Ownable: caller is not the owner"
          );
        });
        it("grants Blur exchange access to call executionDelegate", async () => {
          // ExecutionDelegate grants Blur exchange for transfers
          await executionDelegate.approveContract(blurExchange.address);
          await blurExchange.execute(collection.address, seller.address, buyer.address, 1, 1);
        });
        it("Revoke approval of contract to call transfer functions", async () => {
          await executionDelegate.denyContract(blurExchange.address);
          await expect(
            blurExchange.execute(collection.address, buyer.address, seller.address, 1, 1)
          ).to.be.revertedWith("Contract is not approved to make transfers");
        });
      });

      describe("token Owners revoke exchange approvals", function () {
        it("confirms token owner", async () => {
          expect(await collection.ownerOf(1)).to.eq(seller.address);
        });
        it("control contract from making transfers on-behalf of a specific user", async () => {
          // ExecutionDelegate grants Blur exchange for transfers
          await executionDelegate.approveContract(blurExchange.address);
          // Seller revokes approval for Blur exchange transfers
          await executionDelegate.connect(seller).revokeApproval();
          await expect(
            blurExchange.execute(collection.address, seller.address, buyer.address, 1, 1)
          ).to.be.revertedWith("User has revoked approval");
          // Seller grants approval for Blur exchange transfers
          await executionDelegate.connect(seller).grantApproval();
          // initiates transfer
          await blurExchange.execute(collection.address, seller.address, buyer.address, 1, 1);
        });
      });
    });
