# Pac-Man stacking

<p align="center">
<img src="https://static.wikia.nocookie.net/ssbb/images/0/08/TituloUniversoPac-Man.png/revision/latest?cb=20140628024756&path-prefix=es" align="center"
alt="pacman-game-logo"></p>

This project demonstrates a basic in a funny way how I can create a NFT (ERC721) , Token (ERC20) and a Stacking contract
thats provide us a reward in tokens if we stake the NFTs.

Only for funny porpouses I added a lore for this exercise .I decided to use a PAC-MAN domain for this exercise because
this is a very clear game that's every onw know and I think make sense for this exercise.
***

## How It Works

So let me explain the main Contracts

### PacDos.sol

This is the token ERC20, represents the dot in the game thats pac-man need to eats

### Pacman.sol

This is the NFT ERC721, represent the main character in the game

### Board.sol

This is the stacking contract, represent the board in the Game.
***

## History telling

You can stake your NFT in the staking contract to aern Tokens as a reward or in other words you can throw you Pac-man
into the board to see how they farm points.


***

### Todo

- [x] Create and mint NFT ERC721
- [x] Create and mint Token ERC20
- [x] Stake NFT
- [x] Unstake NFT
- [x] Win rewards in token every 60 seconds for staking
- [x] Claim rewards
- [x] See pending rewards
- [x] Liquidate position
- [x] Tests
- [x] Dockerize project
- [ ] Improvements SafeMath

***

## Liquidation process

We want to add a liquidation option por the NFT in the stacking contract , but what kind of logic we can use?

Now we gonna try to explain my custom logic .

First of all we would call a liquidation process when the **health factor** will be less than LiquidationThreshold . We would retrieve this
health factor from our `Board.sol` contract from the function `healthFactor( tokenId )`, and if `canLiquidate()` is true  we
would call to `asGhostEatsTo(uint256 tokenId)` that it is the liquidation function.

To calculate the **health factor** we will assume this :

- On NFT mint we will mock a fixed value on it, it represents the **collateral** amount in Borrow/Loan terms
- Every 60 seconds we will generate a random new number to simulate a market price movements
- The **Liquidation threshold** will be 50%

> **⚠️ IMPORTANT NOTE: 
>The random number is not a real random , is a pseudo random number , if we want a real random we will need to use
a out of chain random provider with some oracle . So with this example we can anticipate when the NFT can be liquidated,
because you can know the random before it is generated
More information about it [here](https://docs.chain.link/docs/vrf/v2/introduction/)** 
With all this premises we can do the math to calculate the **health factor**  like this .

Hf= HealthFactor, Rn= RandomNumber, Cl= collateral, Lt= LiquidationThreshold.

So the maths are like this :
**Hf= ( Rn / Lt) / Cl**

Example:

- User mint a NFT and the value is 150 on mint , the actual simulate (random) a market price is 100
so the Hf= (100/0,5)/150, the **Hf is 1,33**. So we are safe :)
- 2 min later the new market price is 75, so  Hf= (75/0,5)/150 the **Hf is 1** we are near to liquidation but not yet :)
- 5 min later the new market price is 50, so  Hf= (50/0,5)/150 the **Hf is 0,66** now anyone can call to the function to liquidate us because our Hf is under 1 :(

### Workflow

1. UserA mint a NFT, random value assigned , Example: 150
2. UserB check the health factor of the UserB NFT, Example Response: 0.9
3. UserB can liquidate the NFT from UserA

>**⚠️Note**: Right now we don't liquidate anything , we only throw a event `Liquidated` to simulate this liquidation

More information about [liquidation process](https://docs.aave.com/faq/liquidations).

More information about [health factor](https://docs.aave.com/risk/asset-risk/risk-parameters#health-factor)
