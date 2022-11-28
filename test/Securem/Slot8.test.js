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
const {string} = require("hardhat/internal/core/params/argumentTypes");

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Securem slot8 unit tests", function () {
      let inSecureumNFT, attackInSecureumNFT, deployer, acc1, acc2, salePrice;

      beforeEach(async () => {
        [deployer, acc1, acc2] = await ethers.getSigners();
        salePrice = toWei(1); // 1 ether
        /////////////////////////////////////////////////////////////////////
      });

      describe("Missing zero-address check(s) in the contract", function () {
        // No address exists, returns ZERO address

        beforeEach(async () => {
          const InSecureumNFT = await ethers.getContractFactory("InSecureumNFT");
          (inSecureumNFT = await InSecureumNFT.deploy(ZERO_ADDRESS)), {gasLimit: 100000};
          // ZERO_ADDRESS is beneficiary
          /////////////////////////////////////////////////////////////////////
        });

        it("May allow anyone to start the sale", async () => {
          // deployer is not acc1, anyone can start the sale
          await inSecureumNFT.connect(acc1).startSale(salePrice);
        });
        it("May put the NFT sale proceeds at risk", async () => {
          // deployer is not acc1, anyone can start the sale
          await inSecureumNFT.connect(deployer).startSale(salePrice);
          const balance = await contractBalance(ZERO_ADDRESS);
          await inSecureumNFT.mint({value: toWei(10)});
          // Funs are sent to beneficary upon mint, in this case the ZERO address
          const balanceUpdated = await contractBalance(ZERO_ADDRESS);
          expect(balanceUpdated).to.be.gt(balance);
        });
        it("May burn the newly minted NFTs", async () => {
          // deployer is not acc1, anyone can start the sale
          // Cannot call from the ZERO_ADDRESS address account
        });
      });

      describe("Lower indexed NFTs have rarer traits", function () {
        beforeEach(async () => {});
        it("Buyers can repeatedly mint and revert to receive desired NFT", async () => {
          // How can buyers force a revert
        });
      });

      describe("InSecureumNFT contract ", function () {
        beforeEach(async () => {
          // Pass in attack contract to become beneficiary
          const InSecureumNFT = await ethers.getContractFactory("InSecureumNFT");
          (inSecureumNFT = await InSecureumNFT.deploy(deployer.address)), {gasLimit: 100000};
          const AttackInSecureumNFT = await ethers.getContractFactory("AttackInSecureumNFT");
          attackInSecureumNFT = await AttackInSecureumNFT.deploy(inSecureumNFT.address);

          // attacking contract requires funds
          await attackInSecureumNFT.connect(deployer).deposit({value: toWei(100)});
          expect(await contractBalance(attackInSecureumNFT.address)).to.eq(toWei(100));

          // Start Sale
          await inSecureumNFT.startSale(salePrice);
        });

        it("susceptible to reentrancy, use callback from ERC721 OnReceived", async () => {
          const transactionResponse = await attackInSecureumNFT.exploitMint({value: toWei(1)});
          const transactionReceipt = await transactionResponse.wait();
          id = transactionReceipt.events[0].args.id; // successfully minted with low traits
          expect(await inSecureumNFT.idToOwners(id)).to.eq(attackInSecureumNFT.address);
        });

        it("Refunds excess ETH paid by buyer", async () => {
          // await inSecureumNFT.startSale(salePrice);
          // const balance = await contractBalance(acc1.address);
          // console.log(Number(fromWei(balance)));
          // await inSecureumNFT.connect(acc1).mint({value: toWei(10)});
          // const newBalance = await contractBalance(acc1.address);
          // console.log(Number(fromWei(newBalance)));
        });
      });
    });
