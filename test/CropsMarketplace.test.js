const {ethers, upgrades} = require("hardhat");
const {time, loadFixture} = require("@nomicfoundation/hardhat-network-helpers");
const hre = require("hardhat");
const {expect} = require("chai");

const ERC20 = require("@openzeppelin/contracts/build/contracts/ERC20.json");
const IERC20 = new ethers.utils.Interface(JSON.stringify(ERC20.abi));
const ERC1155 = require("@openzeppelin/contracts/build/contracts/ERC1155.json");
const IERC1155 = new ethers.utils.Interface(JSON.stringify(ERC1155.abi));

describe("Crops Marketplace", function () {
  let crops, market, daiToken, amountToDeposit, deployer, receiver, nftPrice;

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
    nftPrice = ethers.utils.parseEther("0.5");

    // approve market contract to spend deployer DAI
    await daiToken.connect(deployer).approve(market.address, amountToDeposit);

    return {
      cropsAdr: crops.address,
      marketAdr: market.address,
      daiAdr: daiToken.address,
      deployerAdr: deployer.address,
      receiverAdr: receiver.address,
      cropsInstance: crops,
      marketInstance: market,
      daiInstance: daiToken,
    };
  }

  describe("Marketplace test suite", function () {
    it("Executes ERC20 transaction", async () => {
      const {marketInstance, daiAdr, marketAdr, deployerAdr, receiverAdr} = await loadFixture(setUpContractUtils);

      // define the function signature we want to call
      const signature = "transferFrom(address, address, uint256)";

      // define the parameters for that function
      const parameters = [deployerAdr, receiverAdr, amountToDeposit];

      // Encode data
      const encodedData = IERC20.encodeFunctionData(signature, parameters);
      await marketInstance.executeTransaction(daiAdr, [encodedData]);

      // check updated balances
      expect(daiToken.allowance(marketAdr, deployerAdr, amountToDeposit));
      expect(await daiToken.balanceOf(receiverAdr)).to.eq(amountToDeposit);
    });
    it("Executes ERC1155 transaction", async () => {
      const {cropsInstance, marketInstance, deployerAdr, marketAdr, receiverAdr, cropsAdr} = await loadFixture(
        setUpContractUtils
      );

      // confirm balance
      expect(await crops.balanceOf(receiverAdr, 0)).to.eq(0);
      await cropsInstance.setApprovalForAll(marketAdr, true);

      // define the function signature we want to call
      const signature = "safeTransferFrom(address, address, uint256, uint256, bytes)";

      // define the parameters for the functio
      const parameters = [deployerAdr, receiverAdr, 0, 1000, "0x"];

      // Encode data
      const encodedData = IERC1155.encodeFunctionData(signature, parameters);
      await marketInstance.executeTransaction(cropsAdr, [encodedData]);

      // confirm updated balance
      expect(await crops.balanceOf(receiverAdr, 0)).to.eq(1000);
    });
  });
});
