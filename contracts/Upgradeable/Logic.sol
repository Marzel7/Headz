//SPDX-License-Identifier:MITp
pragma solidity ^0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract Logic is Initializable, UUPSUpgradeable, OwnableUpgradeable {
    uint256 public number;

    function initialize(uint256 _number) public initializer {
        __Ownable_init();
        number = _number;
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function incrementNumber() external {
        number += 2;
    }
}
