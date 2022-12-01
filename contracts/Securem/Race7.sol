// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

//import "@openzeppelin/contracts/math/SafeMath.sol";

interface ERC721TokenReceiver {
    function onERC721Received(
        address _operator,
        address _from,
        uint256 _tokenId,
        bytes calldata _data
    ) external returns (bytes4);
}

contract Race7 is ERC721Enumerable, Ownable {
    //using SafeMath for uint256;
    string public IA_PROVENANCE = "";
    uint256 public startingIndexBlock;
    uint256 public startingIndex;
    uint256 public constant apePrice = 800000000000000000; //0.08 ETH
    uint256 public constant maxApePurchase = 20;
    uint256 public MAX_APES;
    bool public saleIsActive = false;
    uint256 public REVEAL_TIMESTAMP;

    constructor(
        string memory name,
        string memory symbol,
        uint256 maxNftSupply,
        uint256 saleStart
    ) ERC721(name, symbol) {
        MAX_APES = maxNftSupply;
        REVEAL_TIMESTAMP = saleStart + (86400 * 9);
    }

    function withdraw() public onlyOwner {
        uint256 balance = address(this).balance;
        payable(msg.sender).transfer(balance);
    }

    function reserveApes() public onlyOwner {
        uint256 supply = totalSupply();
        uint256 i;
        for (i = 0; i < 30; i++) {
            _safeMint(msg.sender, supply + i);
        }
    }

    function setRevealTimestamp(uint256 revealTimeStamp) public onlyOwner {
        REVEAL_TIMESTAMP = revealTimeStamp;
    }

    function setProvenanceHash(string memory provenanceHash) public onlyOwner {
        IA_PROVENANCE = provenanceHash;
    }

    function setBaseURI(string memory baseURI) public onlyOwner {
        setBaseURI(baseURI);
    }

    function flipSaleState() public onlyOwner {
        saleIsActive = !saleIsActive;
    }

    function mintApe(uint256 numberOfTokens) public payable {
        require(saleIsActive, "Sale must be active to mint Ape");
        require(
            numberOfTokens < maxApePurchase,
            "Can only mint 20 tokens at a time"
        );
        require(
            totalSupply() + numberOfTokens <= MAX_APES,
            "Purchase would exceed max supply of Apes"
        );
        require(
            apePrice * (numberOfTokens) <= msg.value,
            "Ether value sent is not correct"
        );

        for (uint256 i = 0; i < numberOfTokens; i++) {
            uint256 mintIndex = totalSupply();
            if (totalSupply() < MAX_APES) {
                // =!
                _safeMint(msg.sender, mintIndex); // mintIndex + 1, will fail
            }
        }

        // If we haven't set the starting index and this is either 1) the last saleable token or 2) the first token to be sold after
        // the end of pre-sale, set the starting index block
        if (
            startingIndexBlock == 0 &&
            (totalSupply() == MAX_APES || block.timestamp >= REVEAL_TIMESTAMP)
        ) {
            startingIndexBlock = block.number; // block.timestamp
        }
    }

    function setStartingIndex() public {
        //anyone can call this
        require(startingIndex == 0, "Starting index is already set");
        require(startingIndexBlock != 0, "Starting index block must be set");

        startingIndex = uint256(blockhash(startingIndexBlock)) % MAX_APES;
        if (block.number - startingIndexBlock > 255) {
            startingIndex = uint256(blockhash(block.number - 1)) % MAX_APES;
        }
        if (startingIndex == 0) {
            startingIndex = startingIndex + 1;
        }
    }

    function emergencySetStartingIndexBlock() public onlyOwner {
        require(startingIndex == 0, "Starting index is already set");
        startingIndexBlock = block.number;
    }
}

contract Race7x is ERC721TokenReceiver {
    Race7 apeContract;
    uint256 purchaseAmount = 0.8 ether;

    bytes4 ERC721_RECEIVED = 0x150b7a02;

    constructor(address _apeContract) {
        apeContract = Race7(_apeContract);
    }

    function onERC721Received(
        address _operator,
        address _from,
        uint256 _tokenId,
        bytes calldata _data
    ) external override returns (bytes4) {
        return ERC721_RECEIVED;
    }

    function mint() external payable {
        apeContract.mintApe{value: msg.value}(1);
    }
}
