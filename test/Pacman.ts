import {network} from "hardhat";
import {expect} from "chai";

const {ethers} = require("hardhat");

describe("Nft mint", function () {
    it("User can mint NFT", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const NftFactory = await ethers.getContractFactory("Pacman");
        const NftContract = await NftFactory.deploy();
        await NftContract.safeMint(owner.address)
        await NftContract.safeMint(addr1.address)

        expect((await NftContract.name()).toString()).to.be.equal("Pacman")
        expect((await NftContract.symbol()).toString()).to.be.equal("PAC")
        expect((await NftContract.counter()).toString()).to.be.equal("2")
        expect((await NftContract.balanceOf(owner.address)).toString()).to.be.equal("1")
        expect((await NftContract.balanceOf(addr1.address)).toString()).to.be.equal("1")
    });
    it("Random user can not mint NFT", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const NftFactory = await ethers.getContractFactory("Pacman");
        const NftContract = await NftFactory.deploy();
        const mintRole = await NftContract.MINTER_ROLE()
        await expect(NftContract.connect(addr1).safeMint(owner.address))
            .to.be.revertedWith(`AccessControl: account ${addr1.address.toLowerCase()} is missing role ${mintRole}`)

    });
});
