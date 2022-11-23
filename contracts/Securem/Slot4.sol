pragma solidity ^0.8.0;
import "hardhat/console.sol";

contract Slot4 {}

contract Q4 {
    mapping(uint256 => address) addresses;
    bool public check;

    modifier onlyIf() {
        if (check) {
            _;
        }
    }

    function setAddress(uint256 id, address addr) public {
        addresses[id] = addr;
    }

    function getAddress(uint256 id) public view onlyIf returns (address) {
        return addresses[id];
    }

    function getAddressNoModifier(uint256 id)
        public
        view
        returns (address adr)
    {
        adr = addresses[id];
    }

    function setCheck(bool val) external returns (bool) {
        check = val;
        return check;
    }
}

contract Q9 {
    // Assume other required functionality is correctly implemented

    uint256 private constant MAX_FUND_RAISE = 100 ether;
    mapping(address => uint256) contributions;

    function contribute() external payable {
        require(address(this).balance != MAX_FUND_RAISE);
        contributions[msg.sender] += msg.value;
    }
}

contract Q12 {
    // Assume other required functionality is correctly implemented

    address admin;
    address payable pool;

    constructor(address _admin) {
        admin = _admin;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin);
        _;
    }

    function setPoolAddress(address payable _pool) external onlyAdmin {
        pool = _pool;
    }

    function addLiquidity() external payable {
        pool.transfer(msg.value);
    }
}

contract Q13 {
    // Assume other required functionality is correctly implemented

    address admin;
    uint256 rewards = 10;
    modifier onlyAdmin() {
        require(msg.sender == admin);
        _;
    }

    function initialize(address _admin) external {
        require(_admin != address(0));
        admin = _admin;
    }

    function setRewards(uint256 _rewards) external onlyAdmin {
        rewards = _rewards;
    }
}
