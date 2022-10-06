const {ethers, upgrades} = require("hardhat");
const {time, loadFixture} = require("@nomicfoundation/hardhat-network-helpers");
const hre = require("hardhat");
const {expect} = require("chai");
const {CloudflareProvider} = require("@ethersproject/providers");

describe("Escrow", function () {
  const purchasePrice = ethers.utils.parseEther("100");
  const escrowAmount = ethers.utils.parseEther("10"); // 10%
  let tokenId = 1;

  async function setUpContractUtils() {
    const [deployer, seller, buyer, inspector, lender] = await ethers.getSigners();

    // const tokenURI = "https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS";

    const RealEstate = await hre.ethers.getContractFactory("RealEstate");
    const realEstate = await RealEstate.deploy();
    await realEstate.deployed();

    const Escrow = await hre.ethers.getContractFactory("Escrow");
    const escrow = await Escrow.deploy();
    await escrow.deployed();

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
    let instanceOne = hre.ethers.getContractAt("Escrow", cloneAddress, deployer);

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
    let instanceTwo = hre.ethers.getContractAt("Escrow", cloneAddress2, deployer);
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
      const {nftAdr, tokenId, purchasePrice, escrowAmount, seller, buyer, inspector, lender, contractFactory} =
        await loadFixture(setUpContractUtils);
      console.log(contractFactory.address, escrowAmount);
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
      //expect(await realEstate.tokenURI(tokenId)).to.eq(tokenURI);
      // expect(await escrow.purchasePrice()).to.eq(purchasePrice);
      // expect(await escrow.escrowAmount()).to.eq(escrowAmount);
      // expect(await escrow.inspectionPassed()).to.eq(false);
    });
  });

  // describe("deposit", function () {
  //   it("deposits", async () => {
  //     // No deposits
  //     expect(await escrow.getBalance()).to.eq(0);
  //     // Insufficient deposit, reverts
  //     await expect(escrow.connect(buyer).depositEarnest({value: 0})).to.be.revertedWith("Insufficient deposit");
  //     // Not called buy buyer, reverts
  //     await expect(escrow.connect(seller).depositEarnest({value: escrowAmount})).to.be.revertedWith(
  //       "not called by buyer"
  //     );
  //     // Deposit
  //     await escrow.connect(buyer).depositEarnest({value: escrowAmount});
  //     // Contract balance updated
  //     expect(await escrow.getBalance()).to.eq(escrowAmount);
  //   });
  // });

  // describe("cancellation", function () {
  //   it("buyer cancels sale", async () => {
  //     // Balances
  //     let buyerBalance = await ethers.provider.getBalance(buyer.address);
  //     //No deposits
  //     await expect(escrow.connect(buyer).cancelSale()).to.be.revertedWith("funds not deposited");
  //     //Deposit
  //     await escrow.connect(buyer).depositEarnest({value: escrowAmount});

  //     // check updated balances
  //     let newBuyerBalance = await ethers.provider.getBalance(buyer.address);
  //     expect(newBuyerBalance).to.be.lt(buyerBalance); // buyer balance has reduced
  //     expect(await escrow.getBalance()).to.eq(escrowAmount); // contract balance = deposit

  //     //Cancel reverts, not whitelisted address
  //     await expect(escrow.connect(deployer).cancelSale()).to.be.revertedWith("not whitelisted");
  //     //Cancel, without inspection
  //     await escrow.connect(buyer).cancelSale();
  //     // check updated balances, deposit is refunded
  //     let buyerBalanceAfterSaleCancelled = await ethers.provider.getBalance(buyer.address);
  //     expect(newBuyerBalance).to.be.lt(buyerBalanceAfterSaleCancelled); // buyer balance has increased
  //     expect(await escrow.getBalance()).to.eq(0);
  //   });

  //   it("seller cancels sale", async () => {
  //     let sellerBalance = await ethers.provider.getBalance(seller.address);
  //     //Deposit
  //     await escrow.connect(buyer).depositEarnest({value: escrowAmount});
  //     // check ucontract balance
  //     expect(await escrow.getBalance()).to.eq(escrowAmount); // contract balance = deposit
  //     // Pass Inspection
  //     await escrow.connect(inspector).setInspectionStatus(true);
  //     await escrow.connect(lender).cancelSale();
  //     // check updated balance, seller is funded deposit
  //     let sellerBalanceAfterCancellation = await ethers.provider.getBalance(seller.address);
  //     expect(sellerBalanceAfterCancellation).to.be.gt(sellerBalance);
  //   });
  // });
});
