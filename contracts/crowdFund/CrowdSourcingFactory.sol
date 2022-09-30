//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract CrowdSourcingFactory is Ownable {
    address immutable crowdFundingImplementation;
    address[] public _deployedContracts;
    uint256 public fundingFee = 0.001 ether;

    // events
    event newCrowdFundingCreated(
        address indexed owner,
        uint256 amount,
        address cloneAddress,
        string fundingCID
    );

    constructor(address _implementation) Ownable() {
        crowdFundingImplementation = _implementation;
    }

    function createCrowdFundingContract(
        string memory _fundingCId,
        uint256 _amount,
        uint256 _duration
    ) external payable returns (address) {
        require(msg.value >= fundingFee, "deposit too small");
        address clone = Clones.clone(crowdFundingImplementation);
        (bool success, ) = clone.call(
            abi.encodeWithSignature(
                "initilize(string, uint256, uint256)",
                _fundingCId,
                _amount,
                _duration
            )
        );
        require(success, "creation failed");

        _deployedContracts.push(clone);
        emit newCrowdFundingCreated(msg.sender, msg.value, clone, _fundingCId);
        return (clone);
    }

    function withdrawFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "Require funds to withdraw");
        (bool success, ) = payable(msg.sender).call{value: balance}("");
        require(success, "Failed to withdraw");
    }

    function deployedContracts() public view returns (address[] memory) {
        return _deployedContracts;
    }

    receive() external payable {}
}
