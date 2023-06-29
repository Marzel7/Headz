//SPDX-License-Identifier:MIT
pragma solidity ^0.8.0;
import "hardhat/console.sol";

contract Yul {
    function returnNumber() external pure returns (uint256) {
        uint256 num;
        assembly {
            num := num
        }
        return num;
    }

    function stringToBytes32(string memory source)
        public
        pure
        returns (bytes32 result)
    {
        bytes memory tempEmptyStringTest = bytes(source);
        if (tempEmptyStringTest.length == 0) {
            return 0x0;
        }

        assembly {
            result := mload(add(source, 32))
        }
    }

    // Yul has only one type - 32 byte word
    function interpretUint() external pure returns (uint256) {
        uint256 x;
        assembly {
            // you can replace 10 with 0xa which is the bytes equivalent
            x := 10
        }
        return x;
    }

    function intepretBool() external pure returns (bool) {
        bool isBool;
        assembly {
            isBool := 1
        }
        return isBool;
    }

    function intepretAddress() external pure returns (address) {
        address adr;
        assembly {
            adr := 1
        }
        // actually returns 0x0000000000000000000000000000000000000001

        return adr;
    }
}

contract YulStorage {
    uint256 number1 = 10;
    uint256 number2 = 20;
    uint128 number3 = 1;
    uint128 number4 = 2;

    uint128 public a = 1;
    uint96 public b = 2;
    uint16 public c = 3;
    uint8 public d = 4;

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

    // Offset is calculted in bytes. Read the value in bytes using getValueInBytes
    // Eachh pair of 2 digit is a byte and we have 63 digits which is 32 bytes
    //
    function getOffset(uint8 num) external pure returns (uint256 offset) {
        assembly {
            switch num
            case 0 {
                offset := a.offset
            }
            case 1 {
                offset := b.offset
            }
            case 2 {
                offset := c.offset
            }
            case 3 {
                offset := d.offset
            }
        }
    }

    function readSlot(uint256 num) external view returns (uint16 cLocal) {
        assembly {
            let slotValue
            let value
            let shifted
            switch num
            // the value = 0x000400050000000.....
            // let value := sload(a.slot)

            // shr stands for shift right
            // we are multiplying c's offset * 8bits
            // every bytes will shift and become 0 => 0x00000000000......
            case 0 {
                slotValue := a.offset
                value := sload(a.slot)
                shifted := shr(mul(a.offset, 8), value)
            }
            case 1 {
                slotValue := b.offset
                value := sload(b.slot)
                shifted := shr(mul(b.offset, 8), value)
            }
            case 2 {
                slotValue := c.offset
                value := sload(c.slot)
                shifted := shr(mul(c.offset, 8), value)
            }
            case 3 {
                slotValue := d.offset
                value := sload(d.slot)
                shifted := shr(mul(d.offset, 8), value)
            }

            // masking operation
            // these f are 1 under the hood ff = 11111111
            cLocal := and(0xfffffffff, shifted)
        }
        return cLocal;
    }
}
