//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract WETH is ERC20 {
    constructor() ERC20("WETH", "WTH") {
        _mint(msg.sender, 1000);
    }
}

contract Collection is ERC721 {
    constructor() ERC721("COLL", "COL") {
        _mint(msg.sender, 1);
    }
}
