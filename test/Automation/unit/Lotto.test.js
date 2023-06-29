const {assert, expect} = require("chai");
const {isBytes, resolveProperties} = require("ethers/lib/utils");
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
        deployer = accounts[0];
        ply1 = accounts[1];
        ply2 = accounts[2];
        await deployments.fixture(["mocks", "lotto"]); // deploys modules with the tags "mocks and "lotto"
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
          const player = await lotto.getPlayer(0);
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
          const {upKeepNeeded} = await lotto.checkUpkeep("0x"); // upkeepNeeded = (timePassed  && isOpen && hasBalance && hasPlayers)
          assert(upKeepNeeded);
        });
      });
      describe("performUpkeep", function () {
        it("can only run if checkupKeep is true", async () => {
          await lotto.register({value: entranceFee});
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
          await network.provider.request({method: "evm_mine", params: []});
          const tx = await lotto.performUpkeep("0x");
          assert(tx);
        });
        it("reverts if checkUpkeep is false", async () => {
          await expect(lotto.performUpkeep("0x")).to.be.revertedWith("Lotto_UpkeepNotNeeded");
        });
        it("updates the lotto state and emits a requestIdupdates the lotto state and emits a requestId", async () => {
          await lotto.register({value: entranceFee});
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
          await network.provider.request({method: "evm_mine", params: []});
          const txResponse = await lotto.performUpkeep("0x"); // emit requestId
          const txReceipt = await txResponse.wait(1); // wait 1 block
          const lottoState = await lotto.getLottoState(); // return state
          const requestId = txReceipt.events[1].args.requestId;
          assert(requestId.toNumber() > 0);
          assert(lottoState == 1); // 0 - OPEN, 1 - CALCULATING
        });
      });

      describe("fulfillRandomWords", function () {
        beforeEach(async () => {
          await lotto.register({value: entranceFee});
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]); // use a higher number here if this test fails
          await network.provider.request({method: "evm_mine", params: []});
        });

        it("can only be called after performUpkeep", async () => {
          await expect(vrfCoordinatorV2Mock.fulfillRandomWords(0, lotto.address)).to.be.revertedWith(
            "nonexistent request"
          );
          await expect(vrfCoordinatorV2Mock.fulfillRandomWords(0, lotto.address)).to.be.revertedWith(
            "nonexistent request"
          );
        });
        // Simulates users entering the lotto and wraps the entire functionality
        // inside a promise that will resolve if everything is successful
        // An event listener for the WinnerPicked is setup
        // Mocks of chainlink keepers and vrf coordinators are used to kickOff this winnerPicked event
        // All the assertions are done once the WinnerPicked  event is fired

        it("picks a winner, resets, mints NFT and sends money", async () => {
          const additionalEntrances = 3; // to test
          const startingIndex = 2;
          for (let i = startingIndex; i < startingIndex + additionalEntrances; i++) {
            lotto = lottoContract.connect(accounts[i]); // Returns a new instance of the lotto contract connected to the player
            await lotto.register({value: entranceFee});
          }
          const startingTimeStamp = await lotto.getLastTimeStamp(); // stores starting timestamp before we fire our event

          // important for staging tests...
          // This will be more important for our staging tests...
          await new Promise(async (resolve, reject) => {
            lotto.once("WinnerPicked", async () => {
              // event listener for WinnerPicked
              console.log("WinnerPicked event fired!");
              // assert throws an error if it fails, so we need to wrap
              // it in a try/catch so that the promise returns event
              // if it fails.
              try {
                // Now lets get the ending values...
                const recentWinner = await lotto.getRecentWinner();
                const lottoState = await lotto.getLottoState();
                const winnerBalance = await accounts[2].getBalance();
                const endingTimeStamp = await lotto.getLastTimeStamp();
                await expect(lotto.getPlayer(0)).to.be.reverted;
                const balanceAfterNFTWin = await lotto.balanceOf(accounts[2].address);

                // // Comparisons to check if our ending values are correct:
                assert.equal(recentWinner.toString(), ply2.address);
                assert.equal(lottoState, 0);
                assert.equal(Number(startingNFTBalance + 1), Number(balanceAfterNFTWin));
                assert(endingTimeStamp > startingTimeStamp);

                // Owner Withdraws ETH from contract
                await lotto.getBalance();
                await lotto.connect(deployer).withdraw();

                assert.equal(
                  winnerBalance.toString(),
                  startingBalance // startingBalance + ( (lottoEntranceFee * additionalEntrances) + lottoEntranceFee )
                    .add(entranceFee.mul(additionalEntrances).add(entranceFee))
                    .toString()
                );

                resolve(); // if try passes, resolves the promise
              } catch (e) {
                reject(e); // if try fails, rejects the promise
              }
            });

            // kicking off the event by mocking the chainlink keepers and vrf coordinator
            const tx = await lotto.performUpkeep("0x");
            const txReceipt = await tx.wait(1);
            const startingNFTBalance = await lotto.balanceOf(accounts[2].address);
            const startingBalance = await accounts[2].getBalance();
            await vrfCoordinatorV2Mock.fulfillRandomWords(txReceipt.events[1].args.requestId, lotto.address);
          });
        });
      });
    });
