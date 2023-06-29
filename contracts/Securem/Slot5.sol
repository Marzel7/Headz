//SPDX-License-Identifier:MIT
pragma solidity 0.8.7;

contract InSecureumToken {
    mapping(address => uint256) private balances;

    uint256 public decimals = 10**18; // decimals supply of the token
    uint256 public totalSupply; // total supply
    uint256 MAX_SUPPLY = 100 ether;

    event Mint(address indexed destination, uint256 amount);

    function transfer(address to, uint256 amount) public {
        // save the balance in local variables
        // so that we can re-use them multiple times
        // without paying for SLOAD on every access
        uint256 balance_from = balances[msg.sender];
        uint256 balance_to = balances[to];
        require(balance_from >= amount);
        balances[msg.sender] = balance_from - amount;
        balances[to] = safeAdd(balance_to, amount);
    }

    /* The balance for the to address is stored before msg sender balance is updated so
    if you pass msg sender as the to address you can claim an arbitrary number of tokens */

    /// @notice Allow users to buy token. 1 ether = 10 tokens
    /// @dev Users can send more ether then token to be bought, to donate a fee to the protocol team
    function buy(uint256 desired_tokens) public payable {
        // Check if enough ether has been sent
        uint256 required_wei_sent = (desired_tokens / 10) * decimals;
        require(msg.value >= required_wei_sent);

        // Mint the tokens
        totalSupply = safeAdd(totalSupply, desired_tokens);
        balances[msg.sender] = safeAdd(balances[msg.sender], desired_tokens);
        emit Mint(msg.sender, desired_tokens);
    }

    /// @notice Add two values, Revert if overflow
    function safeAdd(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a + b < a) {
            revert();
        }
        return a + b;
    }
}

contract S5Q3 {
    event BuyTokens(uint256 amount, address sender);

    // function is marked non-payable
    function buyTokens(uint256 _amount) external {
        emit BuyTokens(_amount, msg.sender);
    }
}

contract S5Q6 {
    mapping(address => uint256) private balances;

    constructor() {
        balances[msg.sender] = 100;
    }

    function transferTokens(address to, uint256 amount) external {
        // exploit vulnerable contract to transfer arbtrary number of tokens
        uint256 balance_from = balances[msg.sender];
        uint256 balance_to = balances[to];

        require(balance_from >= amount);
        balances[msg.sender] = balance_from - amount;
        balances[to] = safeAdd(amount, balance_to);
    }

    function safeAdd(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a + b < a) {
            revert();
        }
        return a + b;
    }

    function getTokenBalance(address account) external view returns (uint256) {
        return balances[account];
    }
}
