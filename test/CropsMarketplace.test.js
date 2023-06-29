const {ethers, upgrades} = require("hardhat");
const {time, loadFixture} = require("@nomicfoundation/hardhat-network-helpers");
const hre = require("hardhat");
const {expect} = require("chai");

const ERC20 = require("@openzeppelin/contracts/build/contracts/ERC20.json");
const IERC20 = new ethers.utils.Interface(JSON.stringify(ERC20.abi));
const ERC1155 = require("@openzeppelin/contracts/build/contracts/ERC1155.json");
const IERC1155 = new ethers.utils.Interface(JSON.stringify(ERC1155.abi));
const ERC721 = require("@openzeppelin/contracts/build/contracts/ERC721.json");
const IERC721 = new ethers.utils.Interface(JSON.stringify(ERC721.abi));

describe("Crops Marketplace", function () {
  let crops, market, daiToken, headz, amountToDeposit, deployer, receiver, nftPrice;

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

    const Headz = await ethers.getContractFactory("Headz");
    headz = await Headz.deploy("Headz", "HDZ");
    await headz.deployed();

    amountToDeposit = ethers.utils.parseEther("0.1");
    nftPrice = ethers.utils.parseEther("0.5");

    // approve market contract to spend deployer DAI
    await daiToken.connect(deployer).approve(market.address, amountToDeposit);

    return {
      cropsAdr: crops.address,
      marketAdr: market.address,
      daiAdr: daiToken.address,
      headzAdr: headz.address,
      deployerAdr: deployer.address,
      receiverAdr: receiver.address,
      cropsInstance: crops,
      headzInstance: headz,
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

      const targets = [daiAdr];

      // Encode data
      const encodedData = IERC20.encodeFunctionData(signature, parameters);
      await marketInstance.executeTransaction(targets, [encodedData]);

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

      // define the parameters for the function
      const parameters = [deployerAdr, receiverAdr, 0, 1000, "0x"];

      const targets = [cropsAdr];

      // Encode data
      const encodedData = IERC1155.encodeFunctionData(signature, parameters);
      await marketInstance.executeTransaction(targets, [encodedData]);

      // confirm updated balance
      expect(await crops.balanceOf(receiverAdr, 0)).to.eq(1000);
    });

    it("Executes multiple transactions", async () => {
      const {cropsInstance, marketInstance, deployerAdr, marketAdr, receiverAdr, cropsAdr, headzAdr, daiAdr} =
        await loadFixture(setUpContractUtils);

      // approvals
      await headz.approve(marketAdr, 1);
      await cropsInstance.setApprovalForAll(marketAdr, true);

      // define the function signature we want to call
      const erc721sig = "safeTransferFrom(address, address, uint256)";
      const erc20sig = "transferFrom(address, address, uint256)";
      const erc1155sig = "safeTransferFrom(address, address, uint256, uint256, bytes)";

      // define the parameters for the function
      const erc721Params = [deployerAdr, receiverAdr, 1];
      const erc20Params = [deployerAdr, receiverAdr, amountToDeposit];
      const erc1155Params = [deployerAdr, receiverAdr, 0, 1000, "0x"];

      const targets = [headzAdr, daiAdr, cropsAdr];

      // Encode data
      const erc721EncodedData = IERC721.encodeFunctionData(erc721sig, erc721Params);
      const erc20EncodedData = IERC20.encodeFunctionData(erc20sig, erc20Params);
      const erc1155EncodedData = IERC1155.encodeFunctionData(erc1155sig, erc1155Params);

      await marketInstance.executeTransaction(targets, [erc721EncodedData, erc20EncodedData, erc1155EncodedData]);

      // updated balances
      expect(await daiToken.balanceOf(receiverAdr)).to.eq(amountToDeposit);
      expect(await crops.balanceOf(receiverAdr, 0)).to.eq(1000);
      expect(await headz.balanceOf(receiverAdr)).to.eq(1);
    });

    it("requires ERC115Holder implementation", async () => {
      const {cropsInstance, marketInstance, deployerAdr, daiAdr} = await loadFixture(setUpContractUtils);

      expect(await cropsInstance.balanceOf(deployerAdr, 0)).to.eq(1000);
      // Dai contract does not implement ERC1155Receiver
      await expect(cropsInstance.safeTransferFrom(deployerAdr, daiAdr, 0, 1, "0x")).to.be.revertedWith(
        "'ERC1155: transfer to non ERC1155Receiver implementer"
      );
    });
  });
});
