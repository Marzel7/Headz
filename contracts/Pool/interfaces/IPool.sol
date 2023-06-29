pragma solidity ^0.8.0;

interface IPool {
    function deposit() external payable;

    function withdraw(uint256) external;

    function transferFrom(
        address,
        address,
        uint256
    ) external returns (bool);
}
