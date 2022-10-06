// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "./Tokens/DaiToken.sol";
import "./Crops.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

contract NFTFarm is Ownable, ERC1155Holder {
    struct UserInfo {
        uint256 stakedAmount;
        uint256 lastUpdated;
        uint256 pointsDebt;
    }

    struct NFTInfo {
        uint256 id;
        uint256 remaining;
        uint256 price;
    }

    DaiToken token;
    Crops crops;
    uint256 emissionRate;

    mapping(address => UserInfo) userInfo;
    NFTInfo[] public nftInfo;

    constructor(
        DaiToken _token,
        Crops _crops,
        uint256 _emissioRate
    ) {
        token = _token;
        crops = _crops;
        emissionRate = _emissioRate;
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

        for (uint64 i = 0; i <= _ids.length; i++) {
            nftInfo.push(
                NFTInfo({id: _ids[i], remaining: _totals[i], price: _prices[i]})
            );
        }
    }

    function claimNfts(
        uint256[] calldata _nfIndexes,
        uint256[] calldata _quantities
    ) external {
        require(
            _nfIndexes.length == _quantities.length,
            "Incorrect array length"
        );

        for (uint64 i = 0; i < _nfIndexes.length; i++) {
            NFTInfo storage nft = nftInfo[_nfIndexes[i]];
            uint256 cost = nft.price * _quantities[i];
            uint256 points = pointsBalance(msg.sender);
            require(points > cost, "Insufficient points balance");
            UserInfo memory user = userInfo[msg.sender];
            // decuct points

            user.pointsDebt = points - cost;
            user.lastUpdated = block.timestamp;
            userInfo[msg.sender] = user;
            nft.remaining -= _quantities[i];
        }

        crops.safeBatchTransferFrom(
            address(this),
            msg.sender,
            _nfIndexes,
            _quantities,
            ""
        );
    }

    function stakeTokens(uint256 _amount) external {
        UserInfo storage user = userInfo[msg.sender];
        token.transferFrom(msg.sender, address(this), _amount);

        // Update user balance
        if (user.stakedAmount != 0) {
            user.pointsDebt = pointsBalance(msg.sender);
        }

        user.lastUpdated = block.timestamp;
        user.stakedAmount += _amount;
    }

    function unstakeTokens() external {
        UserInfo storage user = userInfo[msg.sender];
        require(user.stakedAmount > 0, "Insufficient staking balance");

        token.transfer(msg.sender, user.stakedAmount);

        // Update UserInfo
        user.lastUpdated = block.timestamp;
        user.stakedAmount = 0;
        user.lastUpdated = block.timestamp;
        userInfo[msg.sender] = user;
    }

    function pointsBalance(address userAddress) public view returns (uint256) {
        UserInfo storage user = userInfo[userAddress];
        return user.pointsDebt + (unDebitedPoints(user));
    }

    function unDebitedPoints(UserInfo memory user)
        internal
        view
        returns (uint256)
    {
        return (block.timestamp -
            user.lastUpdated *
            (emissionRate * user.stakedAmount));
    }
}
