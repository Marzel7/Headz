// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Address.sol";
import "./TrustfulOracle.sol";
import "./Exchange.sol";

/**
 * @title TrustfulOracleInitializer
 * @author Damn Vulnerable DeFi (https://damnvulnerabledefi.xyz)
 */

contract AttackExchangeOracle {
    using Address for address payable;

    Exchange exchange;
    TrustfulOracle trustfulOracle;

    constructor(address payable exchangeAddress, address oracleAddress) {
        exchange = Exchange(exchangeAddress);
        trustfulOracle = TrustfulOracle(oracleAddress);
    }

    function execute() external {
        payable(address(exchange)).functionCall(
            abi.encodeWithSignature("buyOne()")
        );
    }

    receive() external payable {}
}
