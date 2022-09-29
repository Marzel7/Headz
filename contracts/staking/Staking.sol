// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
import "./DaiToken.sol";
import "./Crops.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";

contract NFTFarm is Ownable, ERC1155Holder {
    DaiToken public token;
    Crops public crops;
    uint256 emissionRate;

    constructor(
        DaiToken _token,
        Crops _crops,
        uint256 _emissionRate
    ) {
        token = _token;
        crops = _crops;
        emissionRate = _emissionRate;
    }

    struct UserInfo {
        uint256 lastUpdated;
        uint256 stakedAmount;
        uint256 pointsDebt;
    }

    struct NftInfo {
        uint256 price;
    }

    mapping(address => UserInfo) public userInfo;
    NftInfo[] public nfts;

    function stakeTokens(uint256 _amount) external {
        token.transferFrom(msg.sender, address(this), _amount);
        UserInfo storage user = userInfo[msg.sender];

        if (user.stakedAmount != 0) {
            user.pointsDebt = pointsBalance(msg.sender);
        }

        user.stakedAmount += _amount;
        user.lastUpdated = block.timestamp;
    }

    function pointsBalance(address userAddress) public view returns (uint256) {
        UserInfo storage user = userInfo[userAddress];
        return (user.pointsDebt + _unDebitedPoints(user));
    }

    function _unDebitedPoints(UserInfo memory user)
        internal
        view
        returns (uint256)
    {
        return (block.timestamp -
            user.lastUpdated *
            (emissionRate * user.stakedAmount));
    }
}
