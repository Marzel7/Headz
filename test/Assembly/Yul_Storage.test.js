const {assert, expect} = require("chai");
const {ethers} = require("hardhat");

describe("Assembly", function () {
  let yul, yulStorage;
  beforeEach(async () => {
    const Yul = await ethers.getContractFactory("Yul");
    const YulStorage = await ethers.getContractFactory("YulStorage");
    yul = await Yul.deploy();
    yulStorage = await YulStorage.deploy();
  });

  describe("intepret types", function () {
    const value = "beta";
    it("confirms byte values", async () => {
      assert.equal(await yul.stringToBytes32(value), ethers.utils.formatBytes32String(value));
    });

    it("confirms bool values", async () => {
      assert.equal(await yul.intepretBool(), 1);
    });

    it("confirms address values", async () => {
      assert.equal(await yul.intepretAddress(), 1);
    });
  });

  describe("Slot allocation", function () {
    it("returns values to slots", async () => {
      // slot 1
      assert.equal(Number(await yulStorage.getValue(0)), 10);
      // slot 2
      assert.equal(Number(await yulStorage.getValue(1)), 20);
      // unused slot
      assert.equal(Number(await yulStorage.getValue(100)), 0);
    });

    it("returns slot values in bytes", async () => {
      // slot 1
      assert.equal(await yulStorage.getValueInBytes(0), 10);
      // slot 2
      assert.equal(await yulStorage.getValueInBytes(1), 20);
    });
  });

  describe("Slot configuration", function () {
    it("extracts variable values from single slot", async () => {
      let offsetArr = [];
      let valueArr = [];
      for (let i = 0; i <= 3; i++) {
        let offset = await yulStorage.getOffset(i);
        let value = await yulStorage.readSlot(i);
        offsetArr[i] = offset;
        valueArr[i] = value;
      }

      // slot[3] stores all these variables, with the following offsets
      assert.equal(offsetArr[0], 0); // uint128
      assert.equal(offsetArr[1], 16); // uint96
      assert.equal(offsetArr[2], 28); // uint16
      assert.equal(offsetArr[3], 30); // uint8

      // slot[2] = 0x0004000300000000000000000000000200000000000000000000000000000001
      // slots exsists of following when offsets applied

      assert.equal(valueArr[0], 1); // 00000000000000000000000000000001  uint128
      assert.equal(valueArr[1], 2); // 000000000000000000000002          uint96
      assert.equal(valueArr[2], 3); // 0003                              uint16
      assert.equal(valueArr[3], 4); // 0004                              uint8
    });
  });
});
