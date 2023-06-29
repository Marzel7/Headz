//SPDX-License-Identifier:MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "hardhat/console.sol";

contract Slot3 {
    uint256 number1 = 10; // slot 1
    uint256 number2 = 20; // slot 2

    uint256[] public intArr;

    struct IntegerStruct {
        uint256 a;
        uint256 b;
        uint256 c;
    }

    IntegerStruct private integerStruct;

    mapping(address => uint256) userAddr;

    IERC721 erc721;

    // if searching a random location, slot returns 0 if empty
    function getValue(uint256 atSlot) external view returns (uint256 value) {
        assembly {
            value := sload(atSlot)
        }
    }

    function storeValue(uint256 atSlot, uint256 value) external {
        assembly {
            sstore(atSlot, value)
        }
    }

    // Read value of variables stored in the same slot? Bit shifting
    function getValueInBytes(uint256 atSlot)
        external
        view
        returns (bytes32 value)
    {
        assembly {
            value := sload(atSlot)
        }
    }

    function setValue(uint128 val) external {
        intArr.push(val);
    }

    function setIntegerStruct() external {
        integerStruct.a = 1;
        integerStruct.b = 2;
        integerStruct.c = 3;
    }

    function setUserAddress(address adr, uint256 val) external {
        userAddr[adr] = val;
    }

    function mappingSlotLocation(uint256 slot, address key)
        external
        pure
        returns (uint256)
    {
        return (uint256(keccak256(abi.encode(key, slot))));
    }
}
