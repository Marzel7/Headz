//SPDX-License-Identifier:MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

/// @title Chainlink automated lottery contract
/// @author Smart contract programmer
/// @notice Periodically transfers NFTs to players
/// @dev No deposit function, Ether has to be sent directly

contract Lotto is ERC721, KeeperCompatibleInterface, Ownable {
    uint256 interval;
    uint256 lastTimeStamp;

    struct RegistrationInfo {
        bool registered;
        uint256 date;
    }

    mapping(address => RegistrationInfo) registered;

    event Registered(address account, uint256 timestamp);

    /// @notice Deploys contract
    /// @dev - TODO
    constructor(uint256 _intervalVal) ERC721("LOTTO", "LOT") {
        interval = _intervalVal;
    }

    /// @notice Deposits funds to enter lottery
    /// @dev updates Registered mapping with address
    function register() external payable {
        require(msg.value == 0.01 ether, "incorrect amount transferred");
        RegistrationInfo memory registrationInfo = registered[msg.sender];
        registrationInfo.registered = true;
        registrationInfo.date = block.timestamp;

        registered[msg.sender] = registrationInfo;
    }

    /// @notice Withdraw Ether from the contract
    /// @dev Only callable by contract owner
    /// @param _amount to withdraw
    function withdraw(uint256 _amount) external onlyOwner {
        (bool success, ) = msg.sender.call{value: _amount}("");
        require(success, "eth transfer failed");
    }

    /// @notice Return balance of the contract
    /// @dev Uses address(this) to get the cintract address and .balance to return the balance
    /// @return the contract Ether balance
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice Establish interval status
    /// @dev Checks that interval has passed
    /// @return upkeepNeeded status determines calling performUpkeep
    function checkUpkeep(bytes calldata)
        external
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        upkeepNeeded = (block.timestamp - lastTimeStamp) > interval;
    }

    /// @notice Mint NFT to random participant
    /// @dev TODO - use chainlink VRF to determine randomness
    /// @param performData TODO

    function performUpkeep(bytes calldata performData) external override {
        if ((block.timestamp - lastTimeStamp) > interval) {
            lastTimeStamp = block.timestamp;
            _mint(msg.sender, 0);
        }
    }

    /// @notice Receive Ether
    /// @dev alternative deposit function
    receive() external payable {}
}
