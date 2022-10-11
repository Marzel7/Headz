//SPDX-License-Identifier:MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";

contract Vesting is Ownable {
    IERC20 token;
    uint256 expiry;
    bool public isLocked;
    bool public isClaimed;
    address receiver;
    uint256 public lockedAmount;

    constructor(address _token) {
        token = IERC20(_token);
    }

    function lockFunds(uint256 _expiry, uint256 _lockedAmount)
        external
        onlyOwner
    {
        require(!isLocked, "funds alredy locked");

        expiry = _expiry;
        lockedAmount = _lockedAmount;
        isLocked = true;
        isClaimed = false;
        bool success = token.transferFrom(
            msg.sender,
            address(this),
            _lockedAmount
        );
        require(success, "deposit failed");
    }

    function withdraw() external onlyOwner {
        require(isLocked, "funds aren't locked");
        require(!isClaimed, "funds already claimed");
        require(block.timestamp > expiry, "expiry still active");

        bool success = token.transfer(owner(), lockedAmount);
        /// TODO Rentrancy fix
        lockedAmount = 0;
        isClaimed = true;
        require(success, "withdrawal failed");
    }

    function timelockExpires() public view returns (uint256) {
        return block.timestamp - expiry;
    }

    function currentBlock() public view returns (uint256) {
        return block.timestamp;
    }

    function executeTransaction(
        address[] calldata targets,
        bytes[] calldata data
    ) external onlyOwner {
        require(targets.length == data.length, "array lengths dont match");
        uint256 i = 0;
        for (i; i < targets.length; i++) {
            (bool success, bytes memory reason) = targets[i].call(data[i]);
            require(success, string(reason));
        }
    }

    receive() external payable {}
}
