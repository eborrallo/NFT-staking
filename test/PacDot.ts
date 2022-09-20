import {network} from "hardhat";
import {expect} from "chai";

const {ethers} = require("hardhat");

describe("Token mint", function () {
    let TokenContract: any
    beforeEach(async () => {
        const TokenFactory = await ethers.getContractFactory("PacDot");
        TokenContract = await TokenFactory.deploy();
    })
    it("User can mint Tokens", async function () {
        const [owner, addr1] = await ethers.getSigners();

        await TokenContract.mint(owner.address, 100)
        await TokenContract.mint(addr1.address, 200)

        expect((await TokenContract.name()).toString()).to.be.equal("PacDot")
        expect((await TokenContract.symbol()).toString()).to.be.equal("PD")
        expect((await TokenContract.balanceOf(owner.address)).toString()).to.be.equal("100")
        expect((await TokenContract.balanceOf(addr1.address)).toString()).to.be.equal("200")
    });
    it("Random user can not mint Tokens", async function () {
        const [owner, addr1] = await ethers.getSigners();
        const mintRole = await TokenContract.MINTER_ROLE()
        await expect(TokenContract.connect(addr1).mint(addr1.address, 100))
            .to.be.revertedWith(`AccessControl: account ${addr1.address.toLowerCase()} is missing role ${mintRole}`)
        await TokenContract.grantRole(mintRole, addr1.address)
        await TokenContract.connect(addr1).mint(addr1.address, 100)
        expect((await TokenContract.balanceOf(addr1.address)).toString()).to.be.equal("100")

    });
});
