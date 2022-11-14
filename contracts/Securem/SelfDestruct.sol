// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract SelfDestruct {
    function destroy(address payable toDestruct) external {
        selfdestruct(payable(toDestruct));
    }

    receive() external payable {}
}
