// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import 'hardhat/console.sol';

contract TestContract is Ownable {
    function Test1(uint n) external view returns(uint) {
        return n + abi.decode(msg.data[msg.data.length-64:], (uint));
    }

    function Test2(uint n) public view returns(uint) {
        bytes memory fcall = abi.encodeCall(TestContract.Test1,(n));
        bytes memory unpacked = abi.encode(uint(4), uint(5));
        bytes memory xtr = abi.encodePacked(uint(4),uint(5));
        bytes memory all = bytes.concat(fcall,xtr);
        console.logBytes(fcall);v
        console.logBytes(unpacked);
        console.logBytes(xtr);
        console.logBytes(all);
        (bool success, bytes memory data) = address(this).staticcall(all);
        return abi.decode(data,(uint));
    }
    type Nonce is uint256;
    struct Book { Nonce nonce;}

    function NextBookNonce(Book memory x) public pure {
       x.nonce = Nonce.wrap(Nonce.unwrap(x.nonce) + 3);
}

    function Test3(uint n) public pure returns (uint) {
      Book memory bookIndex;
      bookIndex.nonce = Nonce.wrap(7);
      for (uint i=0;i<n;i++) {
         NextBookNonce(bookIndex);
      }
      return Nonce.unwrap(bookIndex.nonce);
    }

    error ZeroAddress();
    error ZeroAmount();
    uint constant ZeroAddressFlag = 1;
    uint constant ZeroAmountFlag = 2;

    function process(address[] memory a, uint[] memory amount) public view returns (uint){
        uint error;
        uint total;
        for (uint i=0;i<a.length;i++) {
            if (a[i] == address(0)) error |= ZeroAddressFlag;  // 1
            if (amount[i] == 0) error |= ZeroAmountFlag;       // 2
            total += amount[i];
        }
        if (error == ZeroAddressFlag) revert ZeroAddress(); // 1
        if (error == ZeroAmountFlag)  revert ZeroAmount();  // 2
        return total;
    }

    function Test4(uint n) public view returns (uint) {
        address[] memory a = new address[](n+1);
        for (uint i=0;i<=n;i++) {
            a[i] = address(uint160(i));
        }
        uint[] memory amount = new uint[](n+1);
        for (uint i=0;i<=n;i++) {
            amount[i] = i;
        }
        return process(a,amount);
    }

    uint public totalMinted;
    uint constant maxMinted = 100;
    event minted(uint totalMinted,uint currentMint);

    modifier checkInvariants() {
        require(!paused, "Paused");
        _;
        invariantCheck();
        require(!paused, "Paused");
    }

    function invariantCheck() public {
        if (totalMinted > maxMinted) // this may never happen
            pause();
    }

    bool public paused;
    function pause() public {
        paused = true;
    }
    function unpause() public onlyOwner {
        paused = false;
    }

    function Test5( uint n) public checkInvariants(){
        totalMinted += n;
        emit minted(n,totalMinted);
    }
}

contract Encode {
    function encode(address _addr, uint256 _num)
        external
        pure
        returns (bytes memory)
    {
        return (abi.encode(_addr, _num));
    }

    function encodeMultiple(
        string memory _string1,
        uint256 _uint,
        string memory _string2
    ) external pure returns (bytes memory) {
        return (abi.encode(_string1, _uint, _string2));
    }

    function decode(bytes memory data)
        external
        pure
        returns (
            string memory _string1,
            uint256 _uint,
            string memory _string2
        )
    {
        (_string1, _uint, _string2) = abi.decode(
            data,
            (string, uint256, string)
        );
    }
}
