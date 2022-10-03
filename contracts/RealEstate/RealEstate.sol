//SPDX-License-Identifier:MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract RealEstate is ERC721URIStorage {
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIds;

    constructor() ERC721("RealEstate", "RET") {
        mint(
            "https://ipfs.io/ipfs/QmTudSYeM7mz3PkYEWXWqPjomRPHogcMFSq7XAvsvsgAPS"
        );
    }

    function mint(string memory _tokenURI) public returns (uint256) {
        _tokenIds.increment();

        uint256 newItem = _tokenIds.current();
        _mint(msg.sender, newItem);
        _setTokenURI(newItem, _tokenURI);

        return newItem;
    }
}
