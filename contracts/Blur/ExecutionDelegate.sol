//SPDX-License-Identifier:MIT
pragma solidity ^0.8.0;
import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

contract ExecutionDelegate is Ownable {
    mapping(address => bool) private contracts;
    mapping(address => bool) private revokedApproval;

    event ApproveContract(address _contract);
    event DenyContract(address _contract);
    event RevokeApproval(address _contract);
    event GrantApproval(address _contract);

    modifier approvedContract() {
        require(
            contracts[msg.sender],
            "Contract is not approved to make transfers"
        );
        _;
    }

    /**
     * @dev Approve contract to call transfer functions
     * @param _contract address of contract to approve
     */
    function approveContract(address _contract) external onlyOwner {
        contracts[_contract] = true;
        emit ApproveContract(_contract);
    }

    /**
     * @dev Revoke approval of contract to call transfer functions
     * @param _contract address of contract to revoke approval
     */

    function denyContract(address _contract) external onlyOwner {
        contracts[_contract] = false;
        emit DenyContract(_contract);
    }

    /**
     * @dev Block contract from making transfers on-behalf of a specific user
     */

    function revokeApproval() external {
        revokedApproval[msg.sender] = true;
        emit RevokeApproval(msg.sender);
    }

    /**
     * @dev Allow contract to make transfers on-behalf of a specific user
     */
    function grantApproval() external {
        revokedApproval[msg.sender] = false;
        emit GrantApproval(msg.sender);
    }

    /**
     * @dev Transfer ERC721 token using `transferFrom`
     * @param collection address of the collection
     * @param from address of the sender
     * @param to address of the recipient
     * @param tokenId tokenId
     */

    function transferERC721(
        address collection,
        address from,
        address to,
        uint256 tokenId
    ) external approvedContract {
        require(revokedApproval[from] == false, "User has revoked approval");
        IERC721(collection).safeTransferFrom(from, to, tokenId);
    }

    /**
     * @dev Transfer ERC1155 token using `safeTransferFrom`
     * @param collection address of the collection
     * @param from address of the sender
     * @param to address of the recipient
     * @param tokenId tokenId
     * @param amount amount
     */

    function transferERC1155(
        address collection,
        address from,
        address to,
        uint256 tokenId,
        uint256 amount
    ) external approvedContract {
        require(revokedApproval[from] == false, "User has revoked approval");
        IERC1155(collection).safeTransferFrom(from, to, tokenId, amount, "");
    }

    function transferERC20(
        address token,
        address from,
        address to,
        uint256 amount
    ) external approvedContract returns (bool) {
        require(revokedApproval[from] == false, "User has revoked approval");
        return IERC20(token).transferFrom(from, to, amount);
    }
}
