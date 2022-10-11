//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract DaiToken is ERC20 {
    constructor(string memory _name, string memory _symbol)
        ERC20(_name, _symbol)
    {
        _mint(msg.sender, (100000**10) ^ 18);
    }
}

contract Headz is ERC721 {
    constructor(string memory _name, string memory _symbol)
        ERC721(_name, _symbol)
    {
        _mint(msg.sender, 1); // lazy Mint
    }
}
