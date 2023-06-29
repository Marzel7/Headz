const {ethers} = require("hardhat");
const {BigNumber} = require("ethers");

const toWei = value => ethers.utils.parseEther(value.toString());
const fromWei = value => parseInt(value.toString()) / 1e18;

const contractBalance = adr => ethers.provider.getBalance(adr);
const contractCode = adr => ethers.provider.getCode(adr);

/// Memory allocation functions ////
async function getBytePackedVar(slot, contractAddress, byteShift, byteSize) {
  const paddedSlot = ethers.utils.hexZeroPad(slot, 32);
  const storageLocation = await ethers.provider.getStorageAt(contractAddress, paddedSlot);
  let result = "";
  let altByteSize = 0;
  let altByteShift = 0;
  let check = false;

  if (byteSize <= 6) {
    return BigNumber.from(storageLocation)
      .shr(byteShift * 4)
      .mask(byteSize * 4 * 2)
      .toNumber()
      .toString(16);
  } else {
    altByteSize = byteSize - 6;
    altByteShift = byteShift + 12;
    check = true;
    result += await getBytePackedVar(slot, contractAddress, altByteShift, altByteSize);
  }

  if (check) {
    result += await getBytePackedVar(slot, contractAddress, byteShift, 6);
  }
  return result;
}
async function getArrayItem(slot, contractaddress, item, byteSize) {
  const hashedSlot = ethers.utils.keccak256(ethers.utils.hexZeroPad(slot, 32));
  const itemsPerSlot = 32 / byteSize;
  let itemPos = item;

  for (let s = 1; s < item; s++) {
    if (item >= itemsPerSlot) {
      itemPos - itemsPerSlot;
    }
  }
  let bytesShift = (itemPos / itemsPerSlot) * 64;

  while (bytesShift >= 64) {
    bytesShift -= 64;
  }

  const hashedSlotByItem = BigNumber.from(hashedSlot).add(Math.floor(item / itemsPerSlot));
  return getBytePackedVar(hashedSlotByItem, contractaddress, bytesShift, byteSize);
}

async function getUint256(slot, contractAddress) {
  const paddedSlot = ethers.utils.hexZeroPad(slot, 32);
  const storageLocation = await ethers.provider.getStorageAt(contractAddress, paddedSlot);
  const storageValue = BigNumber.from(storageLocation);
  return storageValue;
}

async function getMappingItem(slot, contractAddress, key) {
  const paddedSlot = ethers.utils.hexZeroPad(slot, 32);
  const paddedKey = ethers.utils.hexZeroPad(key, 32);
  const itemSlot = ethers.utils.keccak256(paddedKey + paddedSlot.slice(2));
  return await getUint256(itemSlot, contractAddress);
}

///////////////////////////////////

module.exports = {
  toWei,
  fromWei,
  contractBalance,
  contractCode,
  getBytePackedVar,
  getArrayItem,
  getUint256,
  getMappingItem,
};
