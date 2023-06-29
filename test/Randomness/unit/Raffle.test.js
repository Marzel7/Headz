const {assert, expect} = require("chai");
const {network, deployments, ethers} = require("hardhat");
const {developmentChains, networkConfig} = require("../../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle Unit Tests", function () {
      let raffle, raffleContract, vrfCoordinatorV2Mock, raffleEntranceFee, interval, player; //, deployer
      beforeEach(async () => {
        accounts = await ethers.getSigners();
        player = accounts[1];
        await deployments.fixture(["mocks", "raffle"]); // deploys modules with "mocks" and "raffle"
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock"); // returns a new connection to the VRFCoordinatorMock contract
        raffleContract = await ethers.getContract("Raffle");
        raffle = raffleContract.connect(player); // Returns a new instance of the Raffle contract connected to the player
        raffleEntranceFee = await raffle.getEntranceFee();
        interval = await raffle.getInterval();
      });
      describe("constructor", function () {
        it("it initializes the raffle correctly", async () => {
          const raffleState = (await raffle.getRaffleState()).toString();
          //Comparisons for Raffle initialization
          assert.equal(raffleState, "0");
          assert.equal(interval.toString(), networkConfig[network.config.chainId]["keepersUpdateInterval"]);
        });
      });

      describe("enterRaffle", function () {
        it("reverts when payment is too low", async () => {
          await expect(raffle.enterRaffle()).to.be.revertedWith("Raffle__SendMoreToEnterRaffle");
        });
        it("records player when entering", async () => {
          await raffle.enterRaffle({value: raffleEntranceFee});
          const contractPlayer = await raffle.getPlayer(0);
          assert.equal(player.address, contractPlayer);
        });
        it("emits an event on enter", async () => {
          await expect(raffle.enterRaffle({value: raffleEntranceFee})).to.emit(raffle, "RaffleEnter"); // emits event if entered to index player(s) address
        });

        it("doesn't allow entrance when raffe is calculating", async () => {
          await raffle.enterRaffle({value: raffleEntranceFee});
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
          await network.provider.request({method: "evm_mine", params: []});
          // pretend to be a keeper for a second
          await raffle.performUpkeep([]); // changes the state to calculating for comparisons below
          await expect(raffle.enterRaffle({value: raffleEntranceFee})).to.be.revertedWith("Raffle__RaffleNotOpen"); // is reverted as raffle is calculating
        });
      });

      describe("checkUpkeep", function () {
        it("returns false if people haven't sent any ETH", async () => {
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
          await network.provider.request({method: "evm_mine", paams: []});
          const {upKeepNeeded} = await raffle.callStatic.checkUpkeep("0x"); // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
          assert(!upKeepNeeded);
        });

        it("returns false if raffle isn't open", async () => {
          await raffle.enterRaffle({value: raffleEntranceFee});
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
          await network.provider.request({method: "evm_mine", params: []});
          await raffle.performUpkeep([]); // changes state to calculating
          const raffleState = await raffle.getRaffleState(); // stores the new state
          const {upKeepNeeded} = await raffle.callStatic.checkUpkeep("0x");
          assert.equal(raffleState.toString() == "1", upKeepNeeded == false);
        });

        it("returns false if enough time hasn't passed", async () => {
          await raffle.enterRaffle({value: raffleEntranceFee});
          await network.provider.send("evm_increaseTime", [interval.toNumber() - 10]); // use a higher number here if this test fails
          await network.provider.request({method: "evm_mine", params: []});
          const {upkeepNeeded} = await raffle.callStatic.checkUpkeep("0x"); // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
          //assert(!upkeepNeeded);
        });

        it("returns true if enough time has passed, has players, eth, and is open", async () => {
          await raffle.enterRaffle({value: raffleEntranceFee});
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]); // use a higher number here if this test fails
          await network.provider.request({method: "evm_mine", params: []});
          const {upkeepNeeded} = await raffle.callStatic.checkUpkeep("0x");
          //assert(upkeepNeeded);
        });
      });

      describe("performUpkeep", function () {
        it("can only run if checkupkeep is true", async () => {
          await raffle.enterRaffle({value: raffleEntranceFee});
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
          await network.provider.request({method: "evm_mine", params: []});
          const tx = await raffle.performUpkeep("0x");
          //assert(tx);
        });
        it("reverts if checkUpkeep is false", async () => {
          await expect(raffle.performUpkeep("0x")).to.be.revertedWith("Raffle__UpkeepNotNeeded");
        });

        it("updates the raffle state and emits a requestId", async () => {
          await raffle.enterRaffle({value: raffleEntranceFee});
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
          await network.provider.request({method: "evm_mine", params: []});
          const txResponse = await raffle.performUpkeep("0x"); // emits requestID
          const txReceipt = await txResponse.wait(1); // waits 1 block
          const raffleState = await raffle.getRaffleState(); // updates state
          const requestId = txReceipt.events[1].args.requestId;
          assert(requestId.toNumber() > 0);
          assert(raffleState == 1); // 0 = Open, 1 = Calculating
        });
      });

      describe("fulfillRandomWords", function () {
        beforeEach(async () => {
          await raffle.enterRaffle({value: raffleEntranceFee});
          await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]); // use a higher number here if this test fails
          await network.provider.request({method: "evm_mine", params: []});
        });

        it("can only be called after performUpkeep", async () => {
          await expect(vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)).to.be.revertedWith(
            "nonexistent request"
          );
          await expect(vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)).to.be.revertedWith(
            "nonexistent request"
          );
        });
        // Simulates users entering the raffle and wraps the entire functionality
        // inside a promise that will resolve if everything is successful
        // An event listener for the WinnerPicked is setup
        // Mocks of chainlink keepers and vrf coordinators are used to kickOff this winnerPicked event
        // All the assertions are done once the WinnerPicked  event is fired

        it("picks a winner, resets, and sends money", async () => {
          const additionalEntrances = 3; // to test
          const startingIndex = 2;
          for (let i = startingIndex; i < startingIndex + additionalEntrances; i++) {
            raffle = raffleContract.connect(accounts[i]); // Returns a new instance of the Raffle contract connected to the player
            await raffle.enterRaffle({value: raffleEntranceFee});
          }
          const startingTimeStamp = await raffle.getLastTimeStamp(); // stores starting timestamp before we fire our event

          // important for staging tests...
          // This will be more important for our staging tests...
          await new Promise(async (resolve, reject) => {
            raffle.once("WinnerPicked", async () => {
              // event listener for WinnerPicked
              console.log("WinnerPicked event fired!");
              // assert throws an error if it fails, so we need to wrap
              // it in a try/catch so that the promise returns event
              // if it fails.
              try {
                // Now lets get the ending values...
                const recentWinner = await raffle.getRecentWinner();
                const raffleState = await raffle.getRaffleState();
                const winnerBalance = await accounts[2].getBalance();
                const endingTimeStamp = await raffle.getLastTimeStamp();
                await expect(raffle.getPlayer(0)).to.be.reverted;
                // Comparisons to check if our ending values are correct:
                assert.equal(recentWinner.toString(), accounts[2].address);
                assert.equal(raffleState, 0);
                assert.equal(
                  winnerBalance.toString(),
                  startingBalance // startingBalance + ( (raffleEntranceFee * additionalEntrances) + raffleEntranceFee )
                    .add(raffleEntranceFee.mul(additionalEntrances).add(raffleEntranceFee))
                    .toString()
                );

                assert(endingTimeStamp > startingTimeStamp);
                resolve(); // if try passes, resolves the promise
              } catch (e) {
                reject(e); // if try fails, rejects the promise
              }
            });

            // kicking off the event by mocking the chainlink keepers and vrf coordinator
            const tx = await raffle.performUpkeep("0x");
            const txReceipt = await tx.wait(1);
            const startingBalance = await accounts[2].getBalance();
            await vrfCoordinatorV2Mock.fulfillRandomWords(txReceipt.events[1].args.requestId, raffle.address);
          });
        });
      });
    });
