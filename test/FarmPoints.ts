import {network} from "hardhat";

const {expect} = require("chai");
const {ethers} = require("hardhat");

describe("Staking of one nft", function () {
    it("Should stake an nft and console.log the reward for the first staking cycle", async function () {
        const [owner, addr1] = await ethers.getSigners();

        const deployer = owner.address;
        const nullAddress = "0x0000000000000000000000000000000000000000";
        const account1 = addr1.address;

        const NftFactory = await ethers.getContractFactory("Pacman");
        const TokenFactory = await ethers.getContractFactory("PacDot");
        const StakingSystemFactory = await ethers.getContractFactory("Board");

        const NftContract = await NftFactory.deploy();
        const TokenContract = await TokenFactory.deploy();

        await NftContract.deployed();
        await TokenContract.deployed();

        const StakingSystemContract = await StakingSystemFactory.deploy(
            NftContract.address,
            TokenContract.address
        );
        await StakingSystemContract.deployed()
        const role= await TokenContract.MINTER_ROLE();
        await TokenContract.grantRole(role,StakingSystemContract.address )
        //await TokenContract.connect(addr1).mint(account1,100)
//        console.log("StakingSystem deployed: ", StakingSystemContract.address);

        // setting approval for all in the nft contract to the staking system contract
  //      console.log((StakingSystemContract.address, account1, 0));
        await expect(
            NftContract.setApprovalForAll(StakingSystemContract.address, true)
        )
            .to.emit(NftContract, "ApprovalForAll")
            .withArgs(deployer, StakingSystemContract.address, true);


        //mint 2 nfts

        await expect(NftContract.safeMint(account1))
            .to.emit(NftContract, "Transfer")
            .withArgs(nullAddress, account1, 0);

        await expect(NftContract.safeMint(account1))
            .to.emit(NftContract, "Transfer")
            .withArgs(nullAddress, account1, 1);

        await StakingSystemContract.initStaking();
        await StakingSystemContract.setTokensClaimable(true);

        //stake 1 token
        // signed by account1\

        // we need the staker to setApproval for all to the staking system contract
        await expect(
            NftContract.connect(addr1).setApprovalForAll(
                StakingSystemContract.address,
                true
            )
        )
            .to.emit(NftContract, "ApprovalForAll")
            .withArgs(account1, StakingSystemContract.address, true);

        await expect(StakingSystemContract.connect(addr1).stake(0))
            .to.emit(StakingSystemContract, "Staked")
            .withArgs(account1, 0);

        // look a way to increase time in this test


        await network.provider.send("evm_increaseTime", [60])//1 min
        await network.provider.send("evm_mine")

        const pendingRewardsNft0 = await StakingSystemContract.connect(addr1).pendingRewards(account1, 0)
        await network.provider.send("evm_increaseTime", [3600])// 1hour
        await network.provider.send("evm_mine")

        await StakingSystemContract.connect(addr1).claimReward(account1);

        const balanceToken = await TokenContract.connect(addr1).balanceOf(addr1.address)
        console.log('Rewards claimed', balanceToken.toString())
    });
});
