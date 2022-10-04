const {ethers} = require("hardhat");
const hre = require("hardhat");
const {expect} = require("chai");

describe("Escrow", function () {
  let realEstate, deployer, seller, buyer, inspector, lender, escrow;
  const tokenId = 1;
  const purchasePrice = ethers.utils.parseEther("100");
  const escrowAmount = ethers.utils.parseEther("10"); // 10%
  const tokenURI = "https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS";

  beforeEach(async function () {
    const accounts = await ethers.getSigners();
    [deployer, seller, buyer, inspector, lender] = accounts;
    const RealEstate = await ethers.getContractFactory("RealEstate");
    realEstate = await RealEstate.deploy();
    const Escrow = await ethers.getContractFactory("Escrow");
    escrow = await Escrow.deploy(
      realEstate.address,
      tokenId,
      purchasePrice,
      escrowAmount,
      seller.address,
      buyer.address,
      inspector.address,
      lender.address
    );
  });

  describe("init", function () {
    it("confirms init values", async () => {
      expect(await realEstate.tokenURI(tokenId)).to.eq(tokenURI);
      expect(await escrow.purchasePrice()).to.eq(purchasePrice);
      expect(await escrow.escrowAmount()).to.eq(escrowAmount);
      expect(await escrow.inspectionPassed()).to.eq(false);
    });
  });

  describe("deposit", function () {
    it("deposits", async () => {
      // No deposits
      expect(await escrow.getBalance()).to.eq(0);
      // Insufficient deposit, reverts
      await expect(escrow.connect(buyer).depositEarnest({value: 0})).to.be.revertedWith("Insufficient deposit");
      // Not called buy buyer, reverts
      await expect(escrow.connect(seller).depositEarnest({value: escrowAmount})).to.be.revertedWith(
        "not called by buyer"
      );
      // Deposit
      await escrow.connect(buyer).depositEarnest({value: escrowAmount});
      // Contract balance updated
      expect(await escrow.getBalance()).to.eq(escrowAmount);
    });
  });

  describe("cancellation", function () {
    it("cancels the sale", async () => {
      // Balances
      let buyerBalance = await ethers.provider.getBalance(buyer.address);
      //No deposits
      await expect(escrow.connect(buyer).cancelSale()).to.be.revertedWith("funds not deposited");
      //Deposit
      await escrow.connect(buyer).depositEarnest({value: escrowAmount});

      // check updated balances
      let newBuyerBalance = await ethers.provider.getBalance(buyer.address);
      expect(newBuyerBalance).to.be.lt(buyerBalance); // buyer balance has reduced
      expect(await escrow.getBalance()).to.eq(escrowAmount); // contract balance = deposit

      //Cancel reverts, not whitelisted address
      await expect(escrow.connect(deployer).cancelSale()).to.be.revertedWith("not whitelisted");
      //Cancel, without inspection
      await escrow.connect(buyer).cancelSale();
      // check updated balances, deposit is refunded
      let buyerBalanceAfterSaleCancelled = await ethers.provider.getBalance(buyer.address);
      expect(newBuyerBalance).to.be.lt(buyerBalanceAfterSaleCancelled); // buyer balance has increased
      expect(await escrow.getBalance()).to.eq(0);
    });
  });
});
