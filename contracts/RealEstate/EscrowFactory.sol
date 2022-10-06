//SPDX-License-Identifier:MIT
pragma solidity ^0.8.0;
import "hardhat/console.sol";
import "./Escrow.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";

contract EscrowFactory is Ownable {
    address public immutable escrowImplementation;
    address[] public deployedContracts;
    uint256 fundingFee = 0.00 ether;

    event newEscrowContract(address owner, address cloneAddress);

    constructor(address _escrowImplementation) {
        escrowImplementation = _escrowImplementation;
    }

    function addEscrow(
        address _nftAdr,
        uint256 _nftID,
        uint256 _purchasePrice,
        uint256 _escrowAmount,
        address _seller,
        address _buyer,
        address _inspector,
        address _lender
    ) external payable returns (address) {
        require(msg.value >= fundingFee, "fee is less than required deposit");
        address clone = Clones.clone(escrowImplementation);
        (bool success, ) = clone.call(
            abi.encodeWithSignature(
                "initialize(address,uint256,uint256,uint256,address,address,address,address)",
                _nftAdr,
                _nftID,
                _purchasePrice,
                _escrowAmount,
                _seller,
                _buyer,
                _inspector,
                _lender
            )
        );
        require(success, "failed to clone");
        deployedContracts.push(clone);
        emit newEscrowContract(msg.sender, clone);
        return clone;
    }

    function deployedContract() public view returns (address[] memory) {
        return deployedContracts;
    }

    receive() external payable {}

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "balance is zero");
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "failed to withdraw");
    }
}
