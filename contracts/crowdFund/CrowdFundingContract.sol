//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.0;
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

enum MilestoneStatus {
    Approved,
    Declined,
    Pending
}

contract CrowdFundingContract is Initializable {
    struct Milestone {
        string milestoneCID;
        bool approved;
        uint256 votingPeriod;
        MilestoneStatus status;
        MilestoneVote[] votes;
    }

    struct MilestoneVote {
        address donorAddress;
        bool vote;
    }
    //state variable
    address payable private _campaignOwner;
    string public fundingId;
    uint256 public targetAmount;
    uint256 campaignDuration;

    bool campaignEnded;
    uint256 private _numberOfWithdrawal;
    uint256 private _numberOfDonors;
    uint256 _amountDonated;

    uint32 private _milestoneCounter;

    mapping(address => uint256) public donors;
    mapping(uint256 => Milestone) public milestones;

    event fundsDonated(address indexed donor, uint256 amount, uint256 date);
    event milestoneCreated(
        address indexed owner,
        uint256 datecreated,
        uint256 period
    );

    function makeDonation() external payable {
        uint256 funds = msg.value;
        require(!campaignEnded, "Campaign has ended");
        require(funds > 0, "Must provide funds");
        require(_numberOfWithdrawal != 3, "not taking donations");
        if (donors[msg.sender] == 0) {
            _numberOfDonors += 1;
        }
        donors[msg.sender] += funds;
        _amountDonated += funds;

        emit fundsDonated(msg.sender, funds, block.timestamp);
    }

    function initialise(
        string calldata _fundingId,
        uint256 _amount,
        uint256 _duration
    ) external initializer {
        _campaignOwner = payable(tx.origin);
        fundingId = (_fundingId);
        targetAmount = _amount;
        campaignDuration = _duration;
    }

    function createNewMilestone(
        string memory _milestoneCID,
        uint256 _votingPeriod
    ) public {
        require(msg.sender == _campaignOwner, "Not campaign owner");
        // Check if we have a pending milestone
        // Check if we have a pending milestone or no milestone at all
        require(
            milestones[_milestoneCounter].status != MilestoneStatus.Pending,
            "There is a pending milestone"
        );
        // check if all three milestones has been withdrawn
        require(_numberOfWithdrawal != 3, "no more milestones permitted");

        // create a new milestone
        uint256 milestoneCounter = _milestoneCounter++;
        Milestone storage newmilestone = milestones[milestoneCounter];
        newmilestone.milestoneCID = _milestoneCID;
        newmilestone.approved = false;
        newmilestone.votingPeriod = _votingPeriod;
        newmilestone.status = MilestoneStatus.Pending;
        emit milestoneCreated(msg.sender, block.timestamp, _votingPeriod);
    }

    function voteOnMilestone(bool vote) public {
        require(
            milestones[_milestoneCounter].status == MilestoneStatus.Pending
        );

        // check they are not a donor to the cause
        require(donors[msg.sender] != 0, "you are not a donor");

        uint256 counter = 0;
        uint256 milestoneVoteArrayLength = milestones[_milestoneCounter]
            .votes
            .length;
        bool voted = false;
        for (counter; counter <= milestoneVoteArrayLength; counter++) {
            MilestoneVote memory userVote = milestones[_milestoneCounter].votes[
                counter
            ];
            if (userVote.donorAddress == msg.sender) {
                // alreadt voted
                voted = true;
                break;
            }
        }
        if (!voted) {
            // not voted yet
            MilestoneVote memory userVote;
            userVote.vote = vote;
            userVote.donorAddress = msg.sender;
            milestones[_milestoneCounter].votes.push(userVote);
        }
    }

    function withdraw() external {
        require(
            payable(msg.sender) == _campaignOwner,
            "Only campaign owner can withdraw"
        );
        // check if voting period has finished
        require(
            block.timestamp > milestones[_milestoneCounter].votingPeriod,
            "Voting period isn't complete"
        );
        require(
            milestones[_milestoneCounter].status == MilestoneStatus.Pending,
            "milestone already ended"
        );

        // calculate the percentage
        (uint256 yesvote, uint256 novote) = calculateTheVote(
            milestones[_milestoneCounter].votes
        );

        // check if the yesVote is equal to 2/3 of the total votes
        uint256 twoThirdsOfTotal = (2 * _numberOfDonors * _baseNumber) / 3;
        uint256 yesVoteCalculation = totalYesVote * _baseNumber;

        // check if the milestone passed 2/3
        if (yesVoteCalculation >= twoThirdsOfTotal) {
            milestones[_milestoneCounter].approved = true;
            _numberOfWithdrawal++;

            milestones[_milestoneCounter].status = MilestoneStatus.Approved;
            // transfer 1/3 of the total balance of the contract
            uint256 contractBalance = address(this).balance;
            require(contractBalance > 0, "nothing to withdraw");
            uint256 amountToWithdraw;
            if (_numberOfWithdrawal == 1) {
                // divide by 3 1/3
                amountToWithdraw = contractBalance / 3;
            } else if (_numberOfWithdrawal == 2) {
                // second withdrawal 1/2
                amountToWithdraw = contractBalance / 2;
            } else {
                // final withdrawal
                amountToWithdraw = contractBalance;
                campaignEnded = true;
            }
            (bool success, ) = _campaignOwner.call{value: amountToWithdraw}("");

            emit fundsWithdrawn(
                _campaignOwner,
                amountToWithdraw,
                block.timestamp
            );
            require(success, "failed to withdraw");
        } else {}
    }
}
