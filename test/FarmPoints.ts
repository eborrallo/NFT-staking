import {network} from "hardhat";
import {SignerWithAddress} from "@nomiclabs/hardhat-ethers/src/signers";

const {expect} = require("chai");
const {ethers} = require("hardhat");

describe("Staking actions", function () {
    let NftContract: any
    let TokenContract: any
    let StakingSystemContract: any
    const nullAddress = "0x0000000000000000000000000000000000000000";

    const userStakeNft = async (addr1: SignerWithAddress) => {
        await expect(NftContract.safeMint(addr1.address)).to.emit(NftContract, "Transfer")
            .withArgs(nullAddress, addr1.address, 0);
        expect((await NftContract.balanceOf(addr1.address)).toString()).to.be.equal("1")

        await expect(NftContract.connect(addr1).setApprovalForAll(StakingSystemContract.address, true))
            .to.emit(NftContract, "ApprovalForAll")
            .withArgs(addr1.address, StakingSystemContract.address, true);

        await expect(StakingSystemContract.connect(addr1).stake(0))
            .to.emit(StakingSystemContract, "Staked")
            .withArgs(addr1.address, 0);
        let stakedTokens = await StakingSystemContract.connect(addr1).getStakedTokens(addr1.address)
        stakedTokens = stakedTokens.map((t: any) => t.toString())
        expect(stakedTokens.toString()).to.be.equal(['0'].toString())
        expect(stakedTokens.length).to.be.equal(1)

    }
    const timeSkip = async (seconds: number) => {
        await network.provider.send("evm_increaseTime", [seconds])
        await network.provider.send("evm_mine")
    }
    beforeEach(async () => {
        const NftFactory = await ethers.getContractFactory("Pacman");
        const TokenFactory = await ethers.getContractFactory("PacDot");
        const StakingSystemFactory = await ethers.getContractFactory("Board");

        NftContract = await NftFactory.deploy();
        TokenContract = await TokenFactory.deploy();

        await NftContract.deployed();
        await TokenContract.deployed();
        StakingSystemContract = await StakingSystemFactory.deploy(
            NftContract.address,
            TokenContract.address
        );
        await StakingSystemContract.deployed()

        const role = await TokenContract.MINTER_ROLE();
        await TokenContract.grantRole(role, StakingSystemContract.address)
        await StakingSystemContract.initStaking();
        await StakingSystemContract.setTokensClaimable(true);
    })
    it("User can stake his NFTs", async function () {
        const [deployer, addr1] = await ethers.getSigners();

        await expect(NftContract.setApprovalForAll(StakingSystemContract.address, true)).to.emit(NftContract, "ApprovalForAll")
            .withArgs(deployer.address, StakingSystemContract.address, true);
        await userStakeNft(addr1)

    });
    it("User can unstake his NFTs with out claim rewards", async function () {
        const [deployer, addr1] = await ethers.getSigners();
        await expect(NftContract.setApprovalForAll(StakingSystemContract.address, true)).to.emit(NftContract, "ApprovalForAll")
            .withArgs(deployer.address, StakingSystemContract.address, true);
        await userStakeNft(addr1)
        await StakingSystemContract.connect(addr1).emergencyUnstake(0)
        let stakedTokens = await StakingSystemContract.connect(addr1).getStakedTokens(addr1.address)
        stakedTokens = stakedTokens.map((t: any) => t.toString())
        expect(stakedTokens.toString()).to.be.equal([].toString())
        expect(stakedTokens.length).to.be.equal(0)

    });
    it("User can unstake his NFTs and claim rewards", async function () {
        const [deployer, addr1] = await ethers.getSigners();
        await expect(NftContract.setApprovalForAll(StakingSystemContract.address, true)).to.emit(NftContract, "ApprovalForAll")
            .withArgs(deployer.address, StakingSystemContract.address, true);
        await userStakeNft(addr1)
        await timeSkip(60)
        await StakingSystemContract.connect(addr1).unstake(0)
        let stakedTokens = await StakingSystemContract.connect(addr1).getStakedTokens(addr1.address)
        stakedTokens = stakedTokens.map((t: any) => t.toString())
        expect(stakedTokens.toString()).to.be.equal([].toString())
        expect(stakedTokens.length).to.be.equal(0)
        const tokenBalance = await TokenContract.balanceOf(addr1.address)
        expect(tokenBalance.toString()).to.be.equal('10000000000000000000')
    });
    it("User can claim rewards in Tokens", async function () {
        const [deployer, addr1] = await ethers.getSigners();
        await expect(NftContract.setApprovalForAll(StakingSystemContract.address, true)).to.emit(NftContract, "ApprovalForAll")
            .withArgs(deployer.address, StakingSystemContract.address, true);
        await userStakeNft(addr1)
        await timeSkip(3600)
        await expect(StakingSystemContract.connect(addr1).claimReward(addr1.address))
            .to.emit(StakingSystemContract, "RewardPaid")
            .withArgs(addr1.address, '600000000000000000000');
        const tokenBalance = await TokenContract.balanceOf(addr1.address)
        expect(tokenBalance.toString()).to.be.equal('600000000000000000000')
    });
    it("User can not claim rewards if not exist yet", async function () {
        const [deployer, addr1] = await ethers.getSigners();
        await expect(NftContract.setApprovalForAll(StakingSystemContract.address, true)).to.emit(NftContract, "ApprovalForAll")
            .withArgs(deployer.address, StakingSystemContract.address, true);
        await userStakeNft(addr1)
        await expect(StakingSystemContract.connect(addr1).claimReward(addr1.address)).to.be.revertedWith('0 rewards yet')
        await timeSkip(60)
        await StakingSystemContract.connect(addr1).claimReward(addr1.address)
        await timeSkip(10)
        await expect(StakingSystemContract.connect(addr1).claimReward(addr1.address)).to.be.revertedWith('0 rewards yet')
    });

    it("User can liquidate NFT", async function () {
        const [deployer, addr1] = await ethers.getSigners();
        await userStakeNft(addr1)
        await StakingSystemContract.changeLiquidationThreshold(99)
        let canLiquidate = await StakingSystemContract.canLiquidate( 0)

        if (canLiquidate) {
            await StakingSystemContract.changeLiquidationThreshold(1)
        }

        await expect(StakingSystemContract.asGhostEatsTo(addr1.address, 0)).to.be.revertedWith("This token is not yet enable to be liquidated")
        await StakingSystemContract.changeLiquidationThreshold(99)
        await expect(StakingSystemContract.asGhostEatsTo(addr1.address, 0))
            .to.emit(StakingSystemContract, "Liquidated")
            .withArgs(addr1.address, 0);

    })

});
