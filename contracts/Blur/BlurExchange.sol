//SPDX-License-Identifier:MIT
pragma solidity ^0.8.0;
import "hardhat/console.sol";
import "./IExecutionDelegate.sol";
import "./lib/OrderStruct.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BlurExchange is Ownable {
    IExecutionDelegate executionDelegate;
    address public weth;

    event NewExecutionDelegate(IExecutionDelegate executionDelegate);

    constructor(IExecutionDelegate _executionDelegate, address _weth) {
        executionDelegate = IExecutionDelegate(_executionDelegate);
        weth = _weth;
    }

    function setExecutionDelegate(IExecutionDelegate _executionDelegate)
        external
        onlyOwner
    {
        require(
            address(_executionDelegate) != address(0),
            "address cannot be zero"
        );
        executionDelegate = _executionDelegate;
        emit NewExecutionDelegate(executionDelegate);
    }

    function _transferTo(
        address paymentToken,
        address from,
        address to,
        uint256 amount
    ) internal {
        if (amount == 0) {
            return;
        }

        if (paymentToken == address(0)) {
            /* Transfer funds in ETH. */
            payable(to).transfer(amount);
        } else if (paymentToken == weth) {
            /* Transfer funds in WETH. */
            executionDelegate.transferERC20(paymentToken, from, to, amount);
        } else {
            revert("Invalid payment token");
        }
    }

    function execute(
        address collection,
        address sellOrderTrader,
        address buyOrderTrader,
        uint256 tokenId,
        uint256 amount
    ) external payable {
        AssetType assetType = AssetType.ERC721;
        _executeTokenTransfer(
            collection,
            sellOrderTrader,
            buyOrderTrader,
            tokenId,
            amount,
            assetType
        );
    }

    /**
     * @dev Execute all ERC20 token / ETH transfers associated with an order match (fees and buyer => seller transfer)
     * @param seller seller
     * @param buyer buyer
     * @param paymentToken payment token
     * @param fees fees
     * @param price price
     */
    function _executeFundsTransfer(
        address seller,
        address buyer,
        address paymentToken,
        Fee[] calldata fees,
        uint256 price
    ) internal {
        if (paymentToken == address(0)) {
            require(msg.value == price);
        }

        /* Take fee. */
        //uint256 receiveAmount = _transferFees(fees, paymentToken, buyer, price);

        /* Transfer remainder to seller. */
        _transferTo(paymentToken, buyer, seller, 1);
    }

    function _executeTokenTransfer(
        address collection,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        AssetType assetType
    ) internal {
        /* Assert collection exists. */
        require(_exists(collection), "Collection does not exist");

        /* Call execution delegate. */
        if (assetType == AssetType.ERC721) {
            executionDelegate.transferERC721(collection, from, to, tokenId);
        } else if (assetType == AssetType.ERC1155) {
            executionDelegate.transferERC1155(
                collection,
                from,
                to,
                tokenId,
                amount
            );
        }
    }

    function _exists(address what) internal view returns (bool) {
        uint256 size;
        assembly {
            size := extcodesize(what)
        }
        return size > 0;
    }
}
