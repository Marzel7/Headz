const {expect} = require("chai");
const {BigNumber} = require("ethers");
const {ethers} = require("hardhat");
const {time, loadFixture} = require("@nomicfoundation/hardhat-network-helpers");

describe("RandomNFT", function () {
  let owner;
  let hardhatOurNFTContract, hardhatVrfCoordinatorV2Mock;

  const setUpContractUtils = async () => {
    [owner] = await ethers.getSigners();
    const randomNFT = await ethers.getContractFactory("RandomNFT");
    let vrfCoordinatorV2Mock = await ethers.getContractFactory("VRFCoordinatorV2Mock");

    hardhatVrfCoordinatorV2Mock = await vrfCoordinatorV2Mock.deploy(0, 0);
    await hardhatVrfCoordinatorV2Mock.createSubscription();
    await hardhatVrfCoordinatorV2Mock.fundSubscription(1, ethers.utils.parseEther("7"));
    hardhatOurNFTContract = await randomNFT.deploy(1, hardhatVrfCoordinatorV2Mock.address);

    return {
      hardhatOurNFTContract,
      hardhatOurNFTContractAdr: hardhatOurNFTContract.address,
      hardhatVrfCoordinatorV2Mock,
      hardhatVrfCoordinatorV2MockAdr: hardhatVrfCoordinatorV2Mock.address,
      ownerAdr: owner.address,
    };
  };

  describe("", function () {
    it("Contract should request Random numbers successfully", async () => {
      const {hardhatOurNFTContract} = await loadFixture(setUpContractUtils);
      await expect(hardhatOurNFTContract.safeMint("Halley"))
        .to.emit(hardhatOurNFTContract, "RequestedRandomness")
        .withArgs(BigNumber.from(1), owner.address, "Halley");
    });
    it("Coordinator should successfully receive the request", async () => {
      const {hardhatOurNFTContract, hardhatVrfCoordinatorV2Mock} = await loadFixture(setUpContractUtils);
      await expect(hardhatOurNFTContract.safeMint("Halley")).to.emit(
        hardhatVrfCoordinatorV2Mock,
        "RandomWordsRequested"
      );
    });
    it("Coordinator should fulfill Random Number request", async () => {
      const {hardhatOurNFTContract, hardhatVrfCoordinatorV2Mock, ownerAdr} = await loadFixture(setUpContractUtils);
      let tx = await hardhatOurNFTContract.safeMint("Halley");
      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      const interface = new ethers.utils.Interface([
        "event RequestedRandomness(uint256 reqId, address invoker, string name)",
      ]);
      // Get request Id
      const data = receipt.logs[1].data;
      const topics = receipt.logs[1].topics;
      const event = interface.decodeEventLog("RequestedRandomness", data, topics);
      const [reqId, invoker, name] = event;

      expect(invoker).to.eq(ownerAdr);
      expect(reqId).to.eq(1);
      expect(name).to.eq("Halley");
      await expect(hardhatVrfCoordinatorV2Mock.fulfillRandomWords(reqId, hardhatOurNFTContract.address)).to.emit(
        hardhatVrfCoordinatorV2Mock,
        "RandomWordsFulfilled"
      );
    });

    it("Contract should receive Random Numbers", async () => {
      const {hardhatOurNFTContract, hardhatVrfCoordinatorV2Mock, ownerAdr} = await loadFixture(setUpContractUtils);
      let tx = await hardhatOurNFTContract.safeMint("Halley");

      const receipt = await ethers.provider.getTransactionReceipt(tx.hash);
      const interface = new ethers.utils.Interface([
        "event RequestedRandomness(uint256 reqId, address invoker, string name)",
      ]);
      // Get request Id
      const data = receipt.logs[1].data;
      const topics = receipt.logs[1].topics;
      const event = interface.decodeEventLog("RequestedRandomness", data, topics);
      const [reqId, invoker, name] = event;

      await expect(hardhatVrfCoordinatorV2Mock.fulfillRandomWords(reqId, hardhatOurNFTContract.address)).to.emit(
        hardhatOurNFTContract,
        "ReceivedRandomness"
      );

      expect(await hardhatOurNFTContract.getCharacter(0)).to.include(owner.address.toString(), "Halley");
    });
  });
});
