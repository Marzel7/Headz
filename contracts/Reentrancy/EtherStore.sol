//SPDX-License-Identifier:MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "hardhat/console.sol";

contract EtherStore {
    mapping(address => uint256) public balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw() external virtual {
        uint256 bal = balances[msg.sender];
        require(bal > 0, "address balance is 0");

        (bool success, ) = msg.sender.call{value: bal}("");
        require(success, "failed to transfer");

        balances[msg.sender] = 0;
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}

contract EtherStoreProtected is EtherStore {
    function withdraw() external override {
        uint256 bal = balances[msg.sender];
        require(bal > 0, "balance is zero");

        // update balance
        balances[msg.sender] = 0;
        (bool success, bytes memory reason) = msg.sender.call{value: bal}("");
        require(success, string(reason));
    }
}

contract EtherStoreGuarded is EtherStore, ReentrancyGuard {
    function withdraw() external override nonReentrant {
        uint256 balance = balances[msg.sender];
        (bool success, bytes memory reason) = msg.sender.call{value: balance}(
            ""
        );
        require(success, string(reason));
        balances[msg.sender] = 0;
    }

    function userBalance(address _address) external view returns (uint256) {
        return balances[_address];
    }
}
