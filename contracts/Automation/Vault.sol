pragma solidity ^0.8.0;
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";

contract Vault is KeeperCompatibleInterface {
    address public owner;
    uint256 counter;

    constructor(uint256 updateInterval) {
        owner = msg.sender;
        interval = updateInterval;
        lastTimeStamp = block.timestamp;
    }

    function deposit() external payable {}

    function balanceOf() external view returns (uint256) {
        return address(this).balance;
    }

    uint256 public immutable interval;
    uint256 public lastTimeStamp;

    function checkUpkeep(bytes calldata)
        external
        override
        returns (bool upkeepNeeded, bytes memory performData)
    {
        upkeepNeeded = (block.timestamp - lastTimeStamp) > interval;
    }

    function performUpkeep(bytes calldata performData) external override {
        if ((block.timestamp - lastTimeStamp) > interval) {
            lastTimeStamp = block.timestamp;
            //payable(address(owner)).transfer(0.1 ether);
            counter++;
        }
    }

    function counterBalance() public view returns (uint256) {
        return counter;
    }
}
