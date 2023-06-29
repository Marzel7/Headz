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

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Race10 unit tests", function () {
      let encode, deployer, abi, acc1, acc2, testContract, name, symbol;

      beforeEach(async () => {
        abi = ethers.utils.defaultAbiCoder;
        [deployer, acc1, acc2] = await ethers.getSigners();
        const Encode = await ethers.getContractFactory("Encode");
        encode = await Encode.deploy();
        const TestContract = await ethers.getContractFactory("TestContract");
        testContract = await TestContract.deploy();

        /////////////////////////////////////////////////////////////////////
      });

      describe("Encoding/Decoding", function () {
        // No address exists, returns ZERO address
        it("abi encodes, two params", async () => {
          await encode.encode(deployer.address, 127);
          // returns 64 bytes, as the encoding occurs in 32 bytes each.
          //0x000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266000000000000000000000000000000000000000000000000000000000000007f
          //0x000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266  - deployer address
          //000000000000000000000000000000000000000000000000000000000000007f - 127
        });

        it("abi encodes, three params", async () => {
          await encode.encodeMultiple("João", 3, "Paulo");
          // Bacuase two of the 3 variables are dynamic, the encoding is more complex
          //0000000000000000000000000000000000000000000000000000000000000060
          //0000000000000000000000000000000000000000000000000000000000000003
          //00000000000000000000000000000000000000000000000000000000000000a0
          //0000000000000000000000000000000000000000000000000000000000000005
          //4a6fc3a36f000000000000000000000000000000000000000000000000000000
          //0000000000000000000000000000000000000000000000000000000000000005
          //5061756c6f000000000000000000000000000000000000000000000000000000

          // 1st line contains information about the 1st string
          // 0000000000000000000000000000000000000000000000000000000000000060
          // the data is 60 in hexadecimal, which is 96 in decimal
          // This means the information about the 1st string is founds after 96 bytes from the beginning of the data
          // After 92 bytes, the chunk of 32 bytes has a number 5. This is the number of bytes the string occupies.
          // The next linem, utf-8 encoded: 4a6fc3a36f. Converting from hex to UTF-8, we retreive the word João

          // Following the same pattern, one can retrieve the third string after a0 bytes,
          // that is, after 160 bytes from the beginning of the data. It says it also has 5 bytes (line 4(
          // and its value is 5061756c6f, the UTF-8 encoding for ‘Paulo’
        });
        it("encodes", async () => {
          let result = abi.encode(["uint", "string"], [1234, "Hello World"]);
          expect(result).to.eq(
            "0x00000000000000000000000000000000000000000000000000000000000004d20000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000000b48656c6c6f20576f726c64000000000000000000000000000000000000000000"
          );
        });
      });

      describe("Test1 decoding", function () {
        it("Test2", async () => {
          const res = await testContract.Test2(127);
          //console.log(res.toString());
        });
        it("Test3", async () => {
          const res = await testContract.Test4(0);
          console.log(res.toString());
        });
      });
    });
