//SPDX-License-Identifier:MIT
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@chainlink/contracts/src/v0.8/interfaces/KeeperCompatibleInterface.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/ConfirmedOwner.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "hardhat/console.sol";

/* Errors */

error Lotto_UpkeepNotNeeded(
    uint256 currentBalance,
    uint256 numPlayers,
    uint256 lottoState
);
error Lotto_TransferFailed();
error Lotto_SendMoreToEnterLotto();
error Lotto_LottoNotOpen();

/// @title Chainlink automated lottery contract
/// @author Smart contract programmer
/// @notice Periodically transfers NFTs to players
/// @dev No deposit function, Ether has to be sent directly

contract Lotto is ERC721, VRFConsumerBaseV2, KeeperCompatibleInterface {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    enum LottoState {
        OPEN,
        CALCULATING
    }

    address private owner;

    // Chainlink VRF Varibles
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;

    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_gasLane;
    uint32 private i_callbackGasLimit;
    uint16 private REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 2;

    // Lotto varibles
    uint256 private immutable i_interval;
    uint256 private immutable i_entranceFee;
    uint256 private s_lastTimeStamp;
    address private s_recentWinner;
    address payable[] private s_players;
    LottoState private s_lottoState;

    struct RegistrationInfo {
        bool isRegistered;
        uint256 date;
    }

    struct NftRegistry {
        address winner;
        uint256 t1;
        uint256 t2;
    }

    mapping(address => RegistrationInfo) public registeredAccounts;
    mapping(uint256 => address) public requestToSender;
    mapping(uint256 => NftRegistry) public tokenIdToNftInfo;

    event Registered(address account, uint256 timestamp);
    event RequestedRandomness(uint256 indexed requestId);
    event WinnerPicked(address indexed player);

    modifier onlyOwner() {
        require(msg.sender == owner, "caller is not the owner");
        _;
    }

    constructor(
        address vrfCoordinatorV2,
        uint64 subscriptionId,
        bytes32 gasLane,
        uint256 interval,
        uint256 entranceFee,
        uint32 callbackGasLimit
    ) ERC721("LOTTO", "LOT") VRFConsumerBaseV2(vrfCoordinatorV2) {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_interval = interval;
        i_subscriptionId = subscriptionId;
        i_callbackGasLimit = callbackGasLimit;
        i_entranceFee = entranceFee;
        s_lastTimeStamp = block.timestamp;
        owner = msg.sender;
    }

    /// @dev This is called by Chainlink VRF node
    // calls to send the money to the random winner
    function fulfillRandomWords(uint256, uint256[] memory randomWords)
        internal
        override
    {
        uint256 w1 = randomWords[0];
        uint256 w2 = randomWords[1];

        uint256 tokenId = _tokenIdCounter.current();
        _tokenIdCounter.increment();
        // s_players size x
        uint256 indexOfWinner = randomWords[0] % s_players.length;
        address payable recentWinner = s_players[indexOfWinner];

        NftRegistry memory nftRegistry = NftRegistry(recentWinner, w1, w2);
        tokenIdToNftInfo[tokenId] = nftRegistry;

        /// Mint NFT to Winner
        _safeMint(recentWinner, tokenId);
        s_recentWinner = recentWinner;

        // Transfer balance to winner
        (bool success, ) = recentWinner.call{value: address(this).balance}("");
        require(success, "failed to transfer contract balance");

        s_players = new address payable[](0);
        s_lottoState = LottoState.OPEN;
        s_lastTimeStamp = block.timestamp;

        emit WinnerPicked(recentWinner);
    }

    /// @notice Deposits funds to enter lottery
    function register() external payable {
        if (msg.value < i_entranceFee) {
            revert Lotto_SendMoreToEnterLotto();
        }
        if (s_lottoState != LottoState.OPEN) {
            revert Lotto_LottoNotOpen();
        }
        require(
            !registeredAccounts[msg.sender].isRegistered,
            "registered address"
        );
        RegistrationInfo memory registrationInfo = registeredAccounts[
            msg.sender
        ];
        registrationInfo.isRegistered = true;
        registrationInfo.date = block.timestamp;

        registeredAccounts[msg.sender] = registrationInfo;
        s_players.push(payable(msg.sender));
        emit Registered(msg.sender, block.timestamp);
    }

    function checkUpkeep(bytes memory)
        public
        view
        override
        returns (bool upKeepNeeded, bytes memory)
    {
        // Todo
        bool isOpen = LottoState.OPEN == s_lottoState;
        bool timePassed = block.timestamp > s_lastTimeStamp + i_interval;
        bool hasPlayers = s_players.length > 0;
        bool hasBalance = address(this).balance > 0;
        upKeepNeeded = isOpen && timePassed && hasPlayers && hasBalance;
        return (upKeepNeeded, "0x");
    }

    function performUpkeep(bytes calldata) external override {
        (bool upKeepNeeded, ) = checkUpkeep("");
        if (!upKeepNeeded) {
            revert Lotto_UpkeepNotNeeded(
                address(this).balance,
                s_players.length,
                uint256(s_lottoState)
            );
        }
        s_lottoState = LottoState.CALCULATING;
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );

        emit RequestedRandomness(requestId);
    }

    /// @notice Withdraw Ether from the contract
    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "eth transfer failed");
    }

    function getLottoState() external view returns (LottoState) {
        return s_lottoState;
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    function getInterval() external view returns (uint256) {
        return i_interval;
    }

    function getEntranceFee() external view returns (uint256) {
        return i_entranceFee;
    }

    function getLastTimeStamp() external view returns (uint256) {
        return s_lastTimeStamp;
    }

    function getPlayer(uint256 index) external view returns (address) {
        return s_players[index];
    }

    function getRecentWinner() external view returns (address) {
        return s_recentWinner;
    }

    receive() external payable {}
}
