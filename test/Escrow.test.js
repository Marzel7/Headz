const {ethers, upgrades} = require("hardhat");
const {time, loadFixture} = require("@nomicfoundation/hardhat-network-helpers");
const hre = require("hardhat");
const {expect} = require("chai");

describe("Escrow", function () {
  const purchasePrice = ethers.utils.parseEther("100");
  const escrowAmount = ethers.utils.parseEther("10"); // 10%
  const tokenId = 1;
  const tokenURI = "https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS";
  let realEstate, escrow;

  async function setUpContractUtils() {
    const [deployer, seller, buyer, inspector, lender] = await ethers.getSigners();

    const RealEstate = await hre.ethers.getContractFactory("RealEstate");
    realEstate = await RealEstate.deploy();
    realEstate.deployed();

    const Escrow = await hre.ethers.getContractFactory("Escrow");
    escrow = await Escrow.deploy();
    escrow.deployed();

    const EscrowFactory = await hre.ethers.getContractFactory("EscrowFactory");
    const escrowFactory = await EscrowFactory.deploy(escrow.address);
    await escrowFactory.deployed();

    let tx = await escrowFactory
      .connect(deployer)
      .addEscrow(
        realEstate.address,
        tokenId,
        purchasePrice,
        escrowAmount,
        seller.address,
        buyer.address,
        inspector.address,
        lender.address,
        {value: escrowAmount}
      );
    let wait = await tx.wait();

    const cloneAddress = wait.events[0].args.cloneAddress;

    // load the clone
    let instanceOne = await hre.ethers.getContractAt("Escrow", cloneAddress, deployer);

    let tx2 = await escrowFactory
      .connect(deployer)
      .addEscrow(
        realEstate.address,
        tokenId,
        purchasePrice,
        escrowAmount,
        seller.address,
        buyer.address,
        inspector.address,
        lender.address,
        {value: escrowAmount}
      );
    let waitTwo = await tx2.wait();
    const cloneAddress2 = waitTwo.events[0].args.cloneAddress;

    // // load the clone
    let instanceTwo = await hre.ethers.getContractAt("Escrow", cloneAddress2, deployer);
    //console.log(cloneAddress, cloneAddress2);

    return {
      nftAdr: realEstate.address,
      tokenId,
      deployer,
      seller,
      buyer,
      inspector,
      lender,
      escrowAmount,
      purchasePrice,
      instanceOne,
      instanceTwo,
      contractFactory: escrowFactory,
    };
  }
  describe("Contract Factory test suite", function () {
    it("should create a clone contract and create a new escrow", async () => {
      const {
        nftAdr,
        tokenId,
        purchasePrice,
        escrowAmount,
        seller,
        buyer,
        inspector,
        lender,
        contractFactory,
        instanceOne,
      } = await loadFixture(setUpContractUtils);

      let tx = await contractFactory.addEscrow(
        nftAdr,
        tokenId,
        purchasePrice,
        escrowAmount,
        seller.address,
        buyer.address,
        inspector.address,
        lender.address,
        {value: escrowAmount}
      );
      let wait = await tx.wait();
      expect(wait.events[0].args.cloneAddress).to.exist;
      expect(await realEstate.tokenURI(tokenId)).to.eq(tokenURI);
      expect(await instanceOne.purchasePrice()).to.eq(purchasePrice);
      expect(await instanceOne.escrowAmount()).to.eq(escrowAmount);
      expect(await instanceOne.inspectionPassed()).to.eq(false);
    });
  });

  describe("deposit", function () {
    it("deposits", async () => {
      const {
        nftAdr,
        tokenId,
        purchasePrice,
        escrowAmount,
        seller,
        buyer,
        inspector,
        lender,
        contractFactory,
        instanceOne,
      } = await loadFixture(setUpContractUtils);
      // No deposits
      expect(await instanceOne.getBalance()).to.eq(0);
      // Insufficient deposit, reverts
      await expect(instanceOne.connect(buyer).depositEarnest({value: 0})).to.be.revertedWith("Insufficient deposit");
      // Not called buy buyer, reverts
      await expect(instanceOne.connect(seller).depositEarnest({value: escrowAmount})).to.be.revertedWith(
        "not called by buyer"
      );
      // Deposit
      await instanceOne.connect(buyer).depositEarnest({value: escrowAmount});
      // Contract balance updated
      expect(await instanceOne.getBalance()).to.eq(escrowAmount);
    });
  });

  describe("cancellation", function () {
    it("buyer cancels sale", async () => {
      const {
        nftAdr,
        tokenId,
        purchasePrice,
        escrowAmount,
        seller,
        buyer,
        inspector,
        lender,
        contractFactory,
        instanceOne,
      } = await loadFixture(setUpContractUtils);
      // Balances
      let buyerBalance = await ethers.provider.getBalance(buyer.address);
      //No deposits
      await expect(instanceOne.connect(buyer).cancelSale()).to.be.revertedWith("funds not deposited");
      //Deposit
      await instanceOne.connect(buyer).depositEarnest({value: escrowAmount});

      // check updated balances
      let newBuyerBalance = await ethers.provider.getBalance(buyer.address);
      expect(newBuyerBalance).to.be.lt(buyerBalance); // buyer balance has reduced
      expect(await instanceOne.getBalance()).to.eq(escrowAmount); // contract balance = deposit

      //Cancel reverts, not whitelisted address
      await expect(instanceOne.connect(inspector).cancelSale()).to.be.revertedWith("not whitelisted");
      //Cancel, without inspection
      await instanceOne.connect(buyer).cancelSale();
      // check updated balances, deposit is refunded
      let buyerBalanceAfterSaleCancelled = await ethers.provider.getBalance(buyer.address);
      expect(newBuyerBalance).to.be.lt(buyerBalanceAfterSaleCancelled); // buyer balance has increased
      expect(await instanceOne.getBalance()).to.eq(0);
    });

    it("seller cancels sale", async () => {
      const {
        nftAdr,
        tokenId,
        purchasePrice,
        escrowAmount,
        seller,
        buyer,
        inspector,
        lender,
        contractFactory,
        instanceOne,
      } = await loadFixture(setUpContractUtils);
      let sellerBalance = await ethers.provider.getBalance(seller.address);
      //Deposit
      await instanceOne.connect(buyer).depositEarnest({value: escrowAmount});
      // check ucontract balance
      expect(await instanceOne.getBalance()).to.eq(escrowAmount); // contract balance = deposit
      // Pass Inspection
      await instanceOne.connect(inspector).setInspectionStatus(true);
      await instanceOne.connect(lender).cancelSale();
      // check updated balance, seller is funded deposit
      let sellerBalanceAfterCancellation = await ethers.provider.getBalance(seller.address);
      expect(sellerBalanceAfterCancellation).to.be.gt(sellerBalance);
    });
  });

  describe("finalize Sale", function () {
    it("approves, completes sale", async () => {
      const {
        nftAdr,
        tokenId,
        purchasePrice,
        escrowAmount,
        seller,
        buyer,
        inspector,
        lender,
        contractFactory,
        instanceOne,
      } = await loadFixture(setUpContractUtils);
      // Deposit
      await instanceOne.connect(buyer).depositEarnest({value: escrowAmount});
      // Contract balance updated
      expect(await instanceOne.getBalance()).to.eq(escrowAmount);
      // whitelisted parties approve sale
      await expect(instanceOne.connect(buyer).finalizeSale()).to.be.revertedWith("not called by inspector");
      await expect(instanceOne.connect(inspector).finalizeSale()).to.be.revertedWith("inspection not passed");
      await expect(instanceOne.connect(inspector).approveSale()).to.be.revertedWith("not whitelisted");
      await instanceOne.connect(buyer).approveSale();
      await instanceOne.connect(seller).approveSale();
      await instanceOne.connect(lender).approveSale();
    });
  });
});
