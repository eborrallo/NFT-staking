// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import "hardhat/console.sol";

interface IRewardToken is IERC20 {
    function mint(address to, uint256 amount) external;

    function decimals() external view returns (uint8);
}

contract Board is Ownable, ERC721Holder {
    IRewardToken public rewardsToken;
    IERC721 public nft;
    uint256 public liquidationThreshold;

    uint256 public stakedTotal;
    uint256 public stakingStartTime;
    uint256 constant stakingTime = 60 seconds;
    uint256 constant token = 10e18;
    mapping(uint256 => uint256)public  tokensValue;

    struct Staker {
        uint256[] tokenIds;
        mapping(uint256 => uint256) tokenStakingCoolDown;
        uint256 balance;
        uint256 rewardsReleased;
    }

    constructor(IERC721 _nft, IRewardToken _rewardsToken) {
        nft = _nft;
        rewardsToken = _rewardsToken;
        liquidationThreshold = 50;
    }

    mapping(address => Staker) public stakers;

    mapping(uint256 => address) public tokenOwner;
    bool public tokensClaimable;
    bool initialised;

    event Liquidated(address indexed user, uint256 tokenId);

    event Staked(address owner, uint256 amount);

    event Unstaked(address owner, uint256 amount);

    event RewardPaid(address indexed user, uint256 reward);

    event ClaimableStatusUpdated(bool status);
    event LiquidationThresholdUpdated(uint256 amount);

    event EmergencyUnstake(address indexed user, uint256 tokenId);

    function initStaking() public onlyOwner {
        //needs access control
        require(!initialised, "Already initialised");
        stakingStartTime = block.timestamp;
        initialised = true;
    }

    function changeLiquidationThreshold(uint256 th) public onlyOwner {
        require(th < 100, "The Liquidation Threshold should be less than 100");
        require(th > 0, "The Liquidation Threshold should be more than 0");
        liquidationThreshold = th;
        emit LiquidationThresholdUpdated(th);
    }

    function setTokensClaimable(bool _enabled) public onlyOwner {
        //needs access control
        tokensClaimable = _enabled;
        emit ClaimableStatusUpdated(_enabled);
    }

    function getStakedTokens(address _user)
    public
    view
    returns (uint256[] memory tokenIds)
    {
        return stakers[_user].tokenIds;
    }

    function stake(uint256 tokenId) public {
        _stake(msg.sender, tokenId);
    }

    function stakeBatch(uint256[] memory tokenIds) public {
        for (uint256 i = 0; i < tokenIds.length; i++) {
            _stake(msg.sender, tokenIds[i]);
        }
    }

    function _stake(address _user, uint256 _tokenId) internal {
        require(initialised, "Staking System: the staking has not started");
        require(
            nft.ownerOf(_tokenId) == _user,
            "user must be the owner of the token"
        );
        Staker storage staker = stakers[_user];

        staker.tokenIds.push(_tokenId);
        staker.tokenStakingCoolDown[_tokenId] = block.timestamp;
        tokensValue[_tokenId] = random(50, 50);
        tokenOwner[_tokenId] = _user;
        nft.approve(address(this), _tokenId);
        nft.safeTransferFrom(_user, address(this), _tokenId);

        emit Staked(_user, _tokenId);
        stakedTotal++;
    }

    function unstake(uint256 _tokenId) public {
        claimReward(msg.sender);
        _unstake(msg.sender, _tokenId);
    }

    function unstakeBatch(uint256[] memory tokenIds) public {
        claimReward(msg.sender);
        for (uint256 i = 0; i < tokenIds.length; i++) {
            if (tokenOwner[tokenIds[i]] == msg.sender) {
                _unstake(msg.sender, tokenIds[i]);
            }
        }
    }

    // Unstake without caring about rewards. EMERGENCY ONLY.
    function emergencyUnstake(uint256 _tokenId) public {
        require(
            tokenOwner[_tokenId] == msg.sender,
            "nft._unstake: Sender must have staked tokenID"
        );
        _unstake(msg.sender, _tokenId);
        emit EmergencyUnstake(msg.sender, _tokenId);
    }

    function _unstake(address _user, uint256 _tokenId) internal {
        require(
            tokenOwner[_tokenId] == _user,
            "Nft Staking System: user must be the owner of the staked nft"
        );
        Staker storage staker = stakers[_user];

        if (staker.tokenIds.length > 0) {
            staker.tokenIds.pop();
        }
        staker.tokenStakingCoolDown[_tokenId] = 0;
        tokensValue[_tokenId] = 0;
        delete tokenOwner[_tokenId];

        nft.safeTransferFrom(address(this), _user, _tokenId);

        emit Unstaked(_user, _tokenId);
        stakedTotal--;
    }

    function updateRewards(address _user) private {

        Staker storage staker = stakers[_user];
        uint256[] storage ids = staker.tokenIds;
        for (uint256 i = 0; i < ids.length; i++) {
            if (
                staker.tokenStakingCoolDown[ids[i]] <
                block.timestamp + stakingTime &&
                staker.tokenStakingCoolDown[ids[i]] > 0
            ) {
                uint256 partialTime = ((block.timestamp - uint(staker.tokenStakingCoolDown[ids[i]]))) % stakingTime;

                staker.balance += this.pendingRewards(_user, ids[i]);

                staker.tokenStakingCoolDown[ids[i]] = block.timestamp + partialTime;
            }
        }
    }

    function pendingRewards(address _user, uint256 tokenId) public view returns (uint){

        Staker storage staker = stakers[_user];
        if (
            staker.tokenStakingCoolDown[tokenId] <
            block.timestamp + stakingTime &&
            staker.tokenStakingCoolDown[tokenId] > 0
        ) {
            uint256 stakedDays = ((block.timestamp - uint(staker.tokenStakingCoolDown[tokenId]))) / stakingTime;
            return staker.balance + (token * stakedDays);
        }
        return 0;
    }

    function claimReward(address _user) public {
        require(tokensClaimable == true, "Tokens cannnot be claimed yet");
        updateRewards(_user);
        require(stakers[_user].balance > 0, "0 rewards yet");


        stakers[_user].rewardsReleased += stakers[_user].balance;
        rewardsToken.mint(_user, stakers[_user].balance);
        emit RewardPaid(_user, stakers[_user].balance);

        stakers[_user].balance = 0;

    }


    function healthFactor( uint256 tokenId) private view returns (uint){
        return 100 * ((actualValuation() * liquidationThreshold) / 100) / tokensValue[tokenId];
    }

    function actualValuation() public view returns (uint) {
        return random(0, 51);
    }

    function canLiquidate(uint256 tokenId) public view returns (bool) {
        return (healthFactor( tokenId) > 20);
    }

    //LiquidationCall
    function asGhostEatsTo(address _user, uint256 tokenId) public {
        require(canLiquidate( tokenId), "This token is not yet enable to be liquidated");
        emit Liquidated(_user, tokenId);
    }

    function random(uint min, uint max) private view returns (uint){
        uint timeSeconds = block.timestamp % 60;
        uint timeWithOutSeconds = block.timestamp-timeSeconds;
        return min + (uint(keccak256(abi.encodePacked(timeWithOutSeconds))) % max);
    }

}
