# Pac-Man stacking

<p align="center">
<img src="https://static.wikia.nocookie.net/ssbb/images/0/08/TituloUniversoPac-Man.png/revision/latest?cb=20140628024756&path-prefix=es" align="center"
alt="pacman-game-logo"></p>

This project demonstrates a basic in a funny way how I can create a NFT (ERC721) , Token (ERC20) and a Stacking
contract thats provide us a reward in tokens if we stake the NFTs. 

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

You can stake your NFT in the staking contract to aern Tokens as a reward  or in other words you can throw you Pac-man
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
- [ ] Liquidate position
- [ ] Dockerize project
- [x] Tests
