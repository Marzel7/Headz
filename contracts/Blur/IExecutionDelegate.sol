//SPDX-License-Identifier:MIT
pragma solidity ^0.8.0;

interface IExecutionDelegate {
    function revokeApproval() external;

    function grantApproval() external;

    function approveContract(address _contract) external;

    function denyContract(address _contract) external;

    function transferERC721(
        address collection,
        address from,
        address to,
        uint256 tokenId
    ) external;

    function transferERC1155(
        address collection,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount
    ) external;

    function transferERC20(
        address token,
        address from,
        address to,
        uint256 amount
    ) external returns (bool);
}
