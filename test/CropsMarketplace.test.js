const {ethers, upgrades} = require("hardhat");
const {time, loadFixture} = require("@nomicfoundation/hardhat-network-helpers");
const hre = require("hardhat");
const {expect} = require("chai");

const ERC20 = require("@openzeppelin/contracts/build/contracts/ERC20.json");
const IERC20 = new ethers.utils.Interface(JSON.stringify(ERC20.abi));

describe("Crops Marketplace", function () {
  let crops, market, daiToken, amountToDeposit, deployer, receiver;

  async function setUpContractUtils() {
    [deployer, receiver] = await ethers.getSigners();

    const DaiToken = await ethers.getContractFactory("DaiToken");
    daiToken = await DaiToken.deploy("TOKEN", "DAI");
    await daiToken.deployed();

    const Crops = await ethers.getContractFactory("Crops");
    crops = await Crops.deploy();
    await crops.deployed();

    const Market = await ethers.getContractFactory("Market");
    market = await Market.deploy(daiToken.address, crops.address, 1);
    await market.deployed();

    amountToDeposit = ethers.utils.parseEther("0.1");

    // approve market contract to spend deployer DAI
    await daiToken.connect(deployer).approve(market.address, amountToDeposit);

    return {
      cropsAdr: crops.address,
      marketAdr: market.address,
      daiAdr: daiToken.address,
      deployer,
      cropsInstance: crops,
      marketInstance: market,
      daiInstance: daiToken,
    };
  }

  describe("Marketplace test suite", function () {
    it("Executes transaction", async () => {
      const {marketInstance, daiAdr, marketAdr} = await loadFixture(setUpContractUtils);

      // define the function signature we want to call
      const signature = "transferFrom(address, address, uint256)";

      // define the parameters for that function
      const parameter = [deployer.address, marketAdr, amountToDeposit];

      //   // Encode data
      const encodedData = IERC20.encodeFunctionData(signature, parameter);
      await marketInstance.executeTransaction(daiAdr, [encodedData]);

      // check updated balances
      expect(daiToken.allowance(marketAdr, deployer.address, amountToDeposit));
      expect(await daiToken.balanceOf(marketAdr)).to.eq(amountToDeposit);
    });
  });
});
