// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "hardhat/console.sol";

contract Slot2 {
    uint256[] x;
    uint256 public varName = 10;
    Slot2ExternalCall slot2ExternalCall;

    constructor(address _slot2ExternalCall) {
        slot2ExternalCall = Slot2ExternalCall(_slot2ExternalCall);
    }

    function f(uint256[] memory memoryArray) public {
        x = memoryArray; // works, copies the whole array to storage
        uint256[] storage y = x; // works, assigns a pointer, data location of y is storage
        //y[7]; // fine, returnd the 8th element
        delete x; //fine, clears the array and modifiers y

        // The following does not work
        // it would need to create a new temporary array in storage, but storage is statically allocated
        //y = memoryArray;
        // This does not work either, since it would reset the pointerm but theres's
        // no sensible location it could point to
        //delete y;
        g(x); // calls g, handling over a reference to x
        h(x); // calls h and creates an independant, temporary copy in memory
    }

    function g(uint256[] storage) internal pure {}

    function h(uint256[] memory) public pure {}

    function removeVar() external {
        delete varName;
    }

    function getSendingAddress() public view returns (address sender) {
        sender = slot2ExternalCall.getSendingAddress();
    }

    function getOriginAddress() external view returns (address origin) {
        origin = slot2ExternalCall.getOriginAddress();
    }

    function increaseInteger() public {
        varName = 100;
        require(
            msg.sender == address(slot2ExternalCall),
            "caller is not a contract"
        );
    }
}

contract Slot2ExternalCall {
    function getSendingAddress() external view returns (address) {
        return msg.sender;
    }

    function getOriginAddress() external view returns (address) {
        return tx.origin;
    }
}
