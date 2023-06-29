// SPDX-License-Identifier: MIT
pragma solidity ^0.8;

import "@rari-capital/solmate/src/tokens/ERC20.sol";

contract PermitToken is ERC20 {
    constructor() ERC20("Token", "TOKEN", 18) {}

    function mint(address _to, uint256 _amount) external {
        _mint(_to, _amount);
    }

    fallback() external payable {
        (bool success, bytes memory data) = msg.sender.delegatecall(msg.data);
        require(success, "MIGRATION_FAILED");
    }
}
