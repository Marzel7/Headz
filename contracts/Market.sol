//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "./Tokens/DaiToken.sol";
import "./Crops.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

contract Market is Ownable, ERC1155Holder {
    struct UserInfo {
        uint256 lastUpdated;
        uint256 pointsDebt;
        uint256 stakedAmount;
    }

    struct NFTInfo {
        uint256 id;
        uint256 remaining;
        uint256 price;
    }

    DaiToken public dai;
    Crops public crops;

    mapping(address => UserInfo) public userInfo;
    NFTInfo[] public nftInfo;

    constructor(
        DaiToken _dai,
        Crops _crops,
        uint256 _emissionRate
    ) {
        dai = _dai;
        crops = _crops;
        _emissionRate = _emissionRate;
    }

    function addNfts(
        uint256[] calldata _ids,
        uint256[] calldata _totals,
        uint256[] calldata _prices
    ) external onlyOwner {
        require(
            _ids.length == _totals.length || _totals.length == _prices.length,
            "Incorrect array length"
        );

        crops.safeBatchTransferFrom(
            msg.sender,
            address(this),
            _ids,
            _totals,
            ""
        );

        for (uint256 i = 0; i < _ids.length; i++) {
            nftInfo.push(
                NFTInfo({id: _ids[i], remaining: _totals[i], price: _prices[i]})
            );
        }
    }

    function claimNfts(
        uint256[] calldata _nftIndexes,
        uint256[] calldata _quantities
    ) external {
        require(
            _nftIndexes.length == _quantities.length,
            "Incorrect array length"
        );

        for (uint64 i; i < _nftIndexes.length; i++) {
            NFTInfo storage nft = nftInfo[_nftIndexes[i]];
            uint256 cost = nft.price * _quantities[i];
            uint256 points = pointsBalance(msg.sender);
            require(
                nft.remaining > _quantities[i],
                "Not enough crops in NFT Farm"
            );
            require(points >= cost, "Insufficient points");
            UserInfo memory user = userInfo[msg.sender];

            user.pointsDebt = points - cost;
            user.lastUpdated = block.timestamp;
            userInfo[msg.sender] = user;
            nft.remaining -= _quantities[i];
        }

        crops.safeBatchTransferFrom(
            address(this),
            msg.sender,
            _nftIndexes,
            _quantities,
            ""
        );
    }

    function pointsBalance(address userAddress) public returns (uint256) {}
}
