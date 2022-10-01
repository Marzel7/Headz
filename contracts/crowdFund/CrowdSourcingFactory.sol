//SPDX-License-Identifier:MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./CrowdFundingContract.sol";

contract CrowdSourcingFactory is Ownable {
    //state variable
    address immutable crowdFundingContractImplementation;
    address[] public deployedContracts;
    uint256 public fundingFee = 0.001 ether;

    //events
    event newFundingContract(
        address indexed owner,
        uint256 amount,
        address cloneAddress,
        string fundingCID
    );

    constructor(address _crowdFundingContract) {
        crowdFundingContractImplementation = _crowdFundingContract;
    }

    function createFundingContract(
        uint256 _amount,
        string memory _fundingCID,
        uint256 _duration
    ) external payable returns (address) {
        require(_amount > fundingFee, "deposit too small");
        address clone = Clones.clone(crowdFundingContractImplementation);
        (bool success, ) = clone.call(
            abi.encodeWithSignature(
                "initialize(string, uint256, uint256)",
                _fundingCID,
                _amount,
                _duration
            )
        );
        require(success, "failed to create clone contract");
        deployedContracts.push(clone);
        emit newFundingContract(msg.sender, _amount, clone, _fundingCID);
        return (clone);
    }

    function deployContract() public view returns (address[] memory) {
        return deployedContracts;
    }

    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "nothing to withdraw");
        (bool success, ) = payable(msg.sender).call{value: balance}("");
        require(success, "withdraw failed");
    }

    receive() external payable {}
}
