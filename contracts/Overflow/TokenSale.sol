// SPDX-License-Identifier: MIT
pragma solidity 0.8.7;

error Incorrect(uint256 offBy);

contract TokenSale {
    mapping(address => uint256) public balances;
    uint256 constant PRICE_PER_TOKEN = 1 ether;

    uint256 public constant MAX_INT_TYPE = type(uint256).max;

    event Result(bool);

    constructor() payable {
        require(msg.value == PRICE_PER_TOKEN, "requires 1 eth deposit");
    }

    function buy(uint256 _amount) public payable {
        unchecked {
            require(msg.value >= _amount * PRICE_PER_TOKEN);
            balances[msg.sender] += _amount;
        }
    }

    function sell(uint256 _amount) public {
        unchecked {
            require(balances[msg.sender] >= _amount);
            balances[msg.sender] -= _amount;
            (bool success, ) = msg.sender.call{
                value: _amount * PRICE_PER_TOKEN
            }("");
            require(success, "eth transfer failed");
        }
    }

    function getUnitMax() public pure returns (uint256) {
        return MAX_INT_TYPE;
    }

    function getMinEthRequired(uint256 _amount)
        public
        payable
        returns (bool result)
    {
        unchecked {
            if (msg.value != _amount * 1 ether) {
                emit Result(false);
                if (msg.value > _amount * 1 ether) {
                    revert Incorrect(msg.value - (_amount * 1 ether));
                } else {
                    revert Incorrect((_amount * 1 ether) - msg.value);
                }
            }
        }
        emit Result(true);
        return true;
    }
}
