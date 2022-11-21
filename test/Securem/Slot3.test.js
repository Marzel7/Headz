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
} = require("../../helpers/helpers.js");
const {keccak256} = require("ethers/lib/utils");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Securem slot2 unit tests", function () {
      let slot3Contract, contractA, contractB, deployer, acc1, acc2;

      beforeEach(async () => {
        [deployer, acc1, acc2] = await ethers.getSigners();
        const Slot2Contract = await ethers.getContractFactory("Slot3");
        slot3Contract = await Slot2Contract.deploy();
        /////////////////////////////////////////////////////////////////////
      });

      describe("slot allocation", function () {
        it("dynamic array slot returns the array length", async () => {
          expect(await slot3Contract.getValue(0)).to.eq(10); // slot1
          expect(await slot3Contract.getValue(1)).to.eq(20); // slot2

          // Slot 2 is reserved for dynamic array. The slot stores the arrays length.
          // Values at array indexes are hashed to a storage location where all items are located
          // contiguosly. At this stage the array has no length/values
          expect(await slot3Contract.getValue(2)).to.eq(0);

          // init Struct memory allocation (slot3)
          await slot3Contract.setIntegerStruct();
          expect(await slot3Contract.getValue(3)).to.eq(1); // slot4
          expect(await slot3Contract.getValue(4)).to.eq(2); // slot5
          expect(await slot3Contract.getValue(5)).to.eq(3); // slot6

          // Slot 2 array values initialized
          await slot3Contract.setValue(100); // index 0
          await slot3Contract.setValue(200); // index 1
          await slot3Contract.setValue(300); // index 2

          // slot 2 for dynamic array holds the array length
          expect(await slot3Contract.getValue(2)).to.eq(3);
          //  use bit shifting to determine array index values
          expect(parseInt(await getArrayItem(2, slot3Contract.address, 0, 32), 16)).to.eq(100);
          expect(parseInt(await getArrayItem(2, slot3Contract.address, 1, 32), 16)).to.eq(200);
          expect(parseInt(await getArrayItem(2, slot3Contract.address, 2, 32), 16)).to.eq(300);
          expect(parseInt(await getArrayItem(2, slot3Contract.address, 3, 32), 16)).to.eq(0);

          // slot 6
          // mapping is empty
          expect(await slot3Contract.getValue(6)).to.eq(0);

          await slot3Contract.setUserAddress(deployer.address, 99);
          await slot3Contract.setUserAddress(acc1.address, 98);
          await slot3Contract.setUserAddress(acc2.address, 97);

          expect(parseInt(await getMappingItem(6, slot3Contract.address, deployer.address)), 16).to.eq(99);
          expect(parseInt(await getMappingItem(6, slot3Contract.address, acc1.address)), 16).to.eq(98);
          expect(parseInt(await getMappingItem(6, slot3Contract.address, acc2.address)), 16).to.eq(97);

          // slot 6 mapping is still empty
          expect(await slot3Contract.getValue(6)).to.eq(0);
          // mapping values are stored non contiguosly
          const mapping0slot = await slot3Contract.mappingSlotLocation(6, deployer.address);
          const mapping1slot = await slot3Contract.mappingSlotLocation(6, acc1.address);
          const mapping2slot = await slot3Contract.mappingSlotLocation(6, acc2.address);

          // print out non contiguosly slot locations
          expect(await slot3Contract.getValue(mapping0slot)).to.eq(99);
          // console.log(BigNumber.from(mapping0slot).toString());
          // console.log(BigNumber.from(mapping1slot).toString());
          // console.log(BigNumber.from(mapping2slot).toString());
        });
      });
    });
