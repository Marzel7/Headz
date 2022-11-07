const {assert, expect} = require("chai");
const {isBytes} = require("ethers/lib/utils");
const {network, deployments, ethers} = require("hardhat");
const {developmentChains, networkConfig} = require("../../../helper-hardhat-config");
const {fromWei, toWei} = require("../../../helpers/helpers.js");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Lotto Unit Tests", function () {
      let lottoContract, lotto, vrfCoordinatorV2Mock, entranceFee, interval, ply1, ply2;
      ply2; // deployer

      beforeEach(async () => {
        accounts = await ethers.getSigners();
        // deployer = accounts [0]
        ply1 = accounts[1];
        ply2 = accounts[2];
        await deployments.fixture(["mocks", "lotto"]); // deploys modules with the tags "mocks and "raffle"
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock"); // returns a new connection to the VRFCoordinatorV2Mock contract
        lottoContract = await ethers.getContract("Lotto"); // returns a new connection to the lotto contract
        lotto = lottoContract.connect(ply1); // returns a new instance of the lotto contract connected to a player
        interval = await lotto.getInterval();
        entranceFee = await lotto.getEntranceFee();
      });

      describe("constructor", function () {
        it("initializes the lotto correctly", async () => {
          assert.equal(interval, networkConfig[network.config.chainId]["keepersUpdateInterval"]);
          assert.equal(fromWei(entranceFee), fromWei(networkConfig[network.config.chainId]["entranceFee"]));
        });
        it("Initializes state to Open", async () => {
          const lottoState = await lotto.getLottoState();
          assert.equal(lottoState, 0); // 0 - OPEN, 1 - CALCULATING
        });
      });

      describe("register", function () {
        it("revert when fee is too low", async () => {
          await expect(lotto.register()).to.be.revertedWith("Lotto_SendMoreToEnterLotto"); // Deposit is zero
        });

        it("records player when they enter", async () => {
          await lotto.connect(ply1).register({value: entranceFee});
          const player = await lotto.accountsRegistered(0);
          assert(player, ply1);
        });
        it("emits an event on registration", async () => {
          await expect(lotto.register({value: entranceFee})).to.emit(lotto, "Registered");
        });

        it("doesnt allow registration when lotto is calculating", async () => {
          await lotto.register({value: entranceFee});
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
          await network.provider.request({method: "evm_mine", params: []});
          // pretend to be a keeper for a second
          await lotto.performUpkeep([]); // force change the state
          await expect(lotto.connect(ply2).register({value: entranceFee})).to.be.revertedWith("Lotto_LottoNotOpen");
        });
      });
      describe("check upkeep", function () {
        it("returns false if people haven't sent any ETH", async () => {
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
          await network.provider.request({method: "evm_mine", params: []});
          const {upKeepNeeded} = await lotto.callStatic.checkUpkeep("0x");
          assert(!upKeepNeeded);
        });
        it("returns fale if lotto isn't open", async () => {
          await lotto.register({value: entranceFee});
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
          await network.provider.request({method: "evm_mine", params: []});
          await lotto.performUpkeep([]); // force state to change
          const lottoState = await lotto.getLottoState();
          const {upKeepNeeded} = await lotto.checkUpkeep("0x");
          assert(lottoState.toString() == "1", upKeepNeeded == false);
        });
        it("returns false if enough time hasn't passed", async () => {
          await lotto.register({value: entranceFee});
          await network.provider.send("evm_increaseTime", [interval.toNumber() - 10]);
          await network.provider.request({method: "evm_mine", params: []});
          const {upKeepNeeded} = await lotto.checkUpkeep("0x");
          assert(!upKeepNeeded);
        });
        it("returns true if enough time has passed, has players, eth, and is open", async () => {
          await lotto.register({value: entranceFee});
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 15]);
          await network.provider.request({method: "evm_mine", params: []});
          const {upKeepNeeded} = await lotto.checkUpkeep("0x");
          assert(upKeepNeeded);
        });
      });
    });
