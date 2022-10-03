const {ethers} = require("hardhat");
const hre = require("hardhat");
const {expect} = require("chai");

require("chai").use(require("chai-as-promised")).should();

describe("Escrow", function () {
  let realEstate, deployer, seller, buyer, inspector, lender, escrow;
  const tokenId = 1;
  const purchasePrice = ethers.utils.parseEther("100");
  const escrowAmount = ethers.utils.parseEther("1"); // 10%
  const tokenURI = "https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS";

  beforeEach(async () => {
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

  it("confirms init values", async function () {
    expect(await realEstate.tokenURI(tokenId)).to.eq(tokenURI);
    expect(await escrow.purchasePrice()).to.eq(purchasePrice);
    expect(await escrow.escrowAmount()).to.eq(escrowAmount);
    expect(await escrow.inspectionPassed()).to.eq(false);

    expect(await escrow.getBalance()).to.eq(0);
    await escrow.connect(buyer).depositEarnest(), {value: purchasePrice};
    let res = await escrow.getBalance();
    console.log(res);
  });

  it("deposit", async () => {
    let tx;
    // Escrow contract balance is 0

    //await tx.wait();
    //expect(await escrow.getBalance()).to.eq(0);
  });
});
