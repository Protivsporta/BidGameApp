import { ethers, network } from 'hardhat';
import { expect } from 'chai';
import { BidGame } from '../typechain';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/dist/src/signer-with-address';
import { utils, BigNumber } from "ethers";

describe("BidGame", function() {

    let Bob: SignerWithAddress;
    let Alice: SignerWithAddress;
    let Mike: SignerWithAddress;
    let Tony: SignerWithAddress;
    let Fil: SignerWithAddress;
    let Sasha: SignerWithAddress;
    let Ann: SignerWithAddress;
    let Sara: SignerWithAddress;

    let bidGame: BidGame;

    const bidAmount: BigNumber = utils.parseUnits("0.05", 18);  // amount of bid
    const timeIncrement: number = 60;   // 1 min

    beforeEach(async function() {
        [Bob, Alice, Mike, Tony, Fil, Sasha, Ann, Sara] = await ethers.getSigners();

        const BidGame = await ethers.getContractFactory("BidGame", Bob);
        bidGame = await BidGame.deploy();
        await bidGame.deployed();
    })

    it("Should be deployed", async function() {
        expect(bidGame.address).to.be.properAddress;
    })

    describe("Create game", function() {

        it("Should create game", async function() {
            await bidGame.createGame(12, { value: bidAmount });

            expect((await bidGame.gamesList(0)).owner)
            .to.be.equal(Bob.address);
        })

        it("Should transfer money to contract address from the game owner", async function() {
            await expect(() => bidGame.createGame(12, { value: bidAmount }))
            .to.changeEtherBalance(bidGame, bidAmount)
        })

        it("Should revert error message because of 0 value transaction", async function() {
            await expect(bidGame.createGame(12))
            .to.be.revertedWith("Free games are not supported here!")
        })

        it("Should revert error message because of wrong number", async function() {
            await expect(bidGame.createGame(102, { value: bidAmount }))
            .to.be.revertedWith("Choose number between 0 and 100")
        })

        it("Should remember user bid", async function() {
            await bidGame.createGame(12, { value: bidAmount });

            expect((await bidGame.biddersList(0, Bob.address)).number)
            .to.be.equal(12)
        })

        it("Should emit GameCreated event with gameId and chosen number", async function() {
            await expect(bidGame.createGame(12, { value: bidAmount }))
            .to.emit(bidGame, "GameCreated")
            .withArgs(0, 12)
        })

    })

    describe("Join game", function() {
         
        it("Should add participant to the game participants list", async function() {
            await bidGame.createGame(12, { value: bidAmount });

            await network.provider.send("evm_increaseTime", [timeIncrement]);
            await network.provider.send("evm_mine");

            await bidGame.connect(Alice).joinGame(0, 5, { value: bidAmount });

            expect((await bidGame.biddersList(0, Alice.address)).participatedFlag)
            .to.be.equal(true)
        })

        it("Should emit ParticipantJoined event", async function() {
            await bidGame.createGame(12, { value: bidAmount });

            await network.provider.send("evm_increaseTime", [timeIncrement]);
            await network.provider.send("evm_mine");

            await expect(bidGame.connect(Alice).joinGame(0, 7, { value: bidAmount }))
            .to.emit(bidGame, "ParticipantJoined")
            .withArgs(0, Alice.address, 7)
        })
        
        it("Should revert error message because of owner can not join his own game", async function() {
            await bidGame.createGame(12, { value: bidAmount });

            await network.provider.send("evm_increaseTime", [timeIncrement]);
            await network.provider.send("evm_mine");

            await expect(bidGame.connect(Bob).joinGame(0, 5, {value: bidAmount }))
            .to.be.revertedWith("Owner is already in participants list")
        })

        it("Should revert error message because of the game is finished", async function() {
            const timeIncrement10x: number = 600;

            await bidGame.createGame(12, { value: bidAmount });

            await network.provider.send("evm_increaseTime", [timeIncrement10x]);
            await network.provider.send("evm_mine");

            await expect(bidGame.connect(Alice).joinGame(0, 5, {value: bidAmount }))
            .to.be.revertedWith("The game is finished")
        })

        it("Should revert error message because of value of transaction is not equal to bid", async function() {
            const wrongBidAmount: BigNumber = utils.parseUnits("0.03", 18);

            await bidGame.createGame(12, { value: bidAmount });

            await network.provider.send("evm_increaseTime", [timeIncrement]);
            await network.provider.send("evm_mine");

            await expect(bidGame.connect(Alice).joinGame(0, 5, {value: wrongBidAmount }))
            .to.be.revertedWith("Value of the transaction should be equal to the game")
        })

        it("Should revert error message because of number of participants is overflowed", async function() {
            await bidGame.createGame(12, { value: bidAmount });

            await network.provider.send("evm_increaseTime", [timeIncrement]);
            await network.provider.send("evm_mine");

            await bidGame.limitParticipants(0, 2);

            await bidGame.connect(Alice).joinGame(0, 5, { value: bidAmount });

            await expect(bidGame.connect(Tony).joinGame(0, 12, { value: bidAmount }))
            .be.revertedWith("Participants limit has been reached")
        })
    })

    describe("Limit participants", function() {

        it("Should limit participants of game", async function() {
            await bidGame.createGame(12, { value: bidAmount });

            await network.provider.send("evm_increaseTime", [timeIncrement]);
            await network.provider.send("evm_mine");

            await bidGame.limitParticipants(0, 2);

            expect((await bidGame.gamesList(0)).participantsLimit)
            .to.be.equal(2)
        })

        it("Should revert error message because of finished game", async function() {
            const longGameIncrement: number = 600;   // 60sec * 10

            await bidGame.createGame(12, { value: bidAmount });

            await network.provider.send("evm_increaseTime", [longGameIncrement]);
            await network.provider.send("evm_mine");

            await expect(bidGame.limitParticipants(0, 2))
            .to.be.revertedWith("The game is finished")
        })

        it("Should revert error message because of current participant number in the game greater than limit parameter", async function() {
            await bidGame.createGame(12, { value: bidAmount });

            await network.provider.send("evm_increaseTime", [timeIncrement]);
            await network.provider.send("evm_mine");

            await bidGame.connect(Alice).joinGame(0, 5, { value: bidAmount });
            await bidGame.connect(Mike).joinGame(0, 8, { value: bidAmount });

            await expect(bidGame.limitParticipants(0, 2))
            .to.be.revertedWith("Current game already has more participants than limit number")
        })

        it("Should revert error message because of only owner of the game can limit participants", async function() {
            await bidGame.createGame(12, { value: bidAmount });

            await network.provider.send("evm_increaseTime", [timeIncrement]);
            await network.provider.send("evm_mine");

            await expect(bidGame.connect(Alice).limitParticipants(0, 2))
            .to.be.revertedWith("Only game owner can limit number of participants")
        })
    })

    describe("Finish game", function() {
        
        it("Should write only one winner (owner) to the game winners list", async function() {
            const gameFinishedIncrement: number = 600;

            await bidGame.createGame(12, { value: bidAmount });

            await network.provider.send("evm_increaseTime", [gameFinishedIncrement]);
            await network.provider.send("evm_mine");

            await bidGame.finishGame(0);

            expect((await bidGame.prizeList(Bob.address, 0)).isWinner)
            .to.be.equal(true)
        })

        it("Should emit GameFinished event", async function() {
            const gameFinishedIncrement: number = 600;
            
            await bidGame.createGame(12, { value: bidAmount });

            await network.provider.send("evm_increaseTime", [gameFinishedIncrement]);
            await network.provider.send("evm_mine");

            await expect(bidGame.finishGame(0))
            .to.emit(bidGame, "GameFinished")
            .withArgs(0)
        })

        it("Should write to the game winners list only one participant", async function() {
            const gameFinishedIncrement: number = 600;
            const threeBidAmount: BigNumber = utils.parseUnits("0.15", 18);  // amount of three bids
            
            await bidGame.createGame(12, { value: bidAmount });

            await network.provider.send("evm_increaseTime", [timeIncrement]);
            await network.provider.send("evm_mine");

            const randomNumber: number = await bidGame.callStatic.generateRandom();

            await bidGame.connect(Alice).joinGame(0, randomNumber, { value: bidAmount });
            await bidGame.connect(Mike).joinGame(0, 8, { value: bidAmount });

            await network.provider.send("evm_increaseTime", [gameFinishedIncrement]);
            await network.provider.send("evm_mine");

            await bidGame.finishGame(0);

            expect((await bidGame.prizeList(Alice.address, 0)).isWinner)
            .to.be.equal(true)
        })

        it("Should write to the game winners list two participants", async function() { // to test this part change the value of generateRandom() to static value
            const gameFinishedIncrement: number = 600;
            const poolPiece: BigNumber = utils.parseUnits("0.2", 18);  // amount of pool piece to transfer
            
            await bidGame.createGame(12, { value: bidAmount });

            await network.provider.send("evm_increaseTime", [timeIncrement]);
            await network.provider.send("evm_mine");

            const randomNumber: number = await bidGame.callStatic.generateRandom();

            await bidGame.connect(Alice).joinGame(0, randomNumber, { value: bidAmount });
            await bidGame.connect(Mike).joinGame(0, randomNumber, { value: bidAmount });
            await bidGame.connect(Tony).joinGame(0, 12, { value: bidAmount });
            await bidGame.connect(Fil).joinGame(0, 7, { value: bidAmount });
            await bidGame.connect(Sasha).joinGame(0, 5, { value: bidAmount });
            await bidGame.connect(Ann).joinGame(0, 81, { value: bidAmount });
            await bidGame.connect(Sara).joinGame(0, 50, { value: bidAmount });

            await network.provider.send("evm_increaseTime", [gameFinishedIncrement]);
            await network.provider.send("evm_mine");

            await bidGame.finishGame(0);

            expect((await bidGame.prizeList(Alice.address, 0)).isWinner)
            .to.be.equal(true)
        })

        it("Should revert error message because of the game is finished already", async function() {
            const gameFinishedIncrement: number = 600;
            
            await bidGame.createGame(12, { value: bidAmount });

            await network.provider.send("evm_increaseTime", [timeIncrement]);
            await network.provider.send("evm_mine");

            const randomNumber: number = await bidGame.callStatic.generateRandom();

            await bidGame.connect(Alice).joinGame(0, randomNumber, { value: bidAmount });
            await bidGame.connect(Mike).joinGame(0, 8, { value: bidAmount });

            await network.provider.send("evm_increaseTime", [gameFinishedIncrement]);
            await network.provider.send("evm_mine");

            await bidGame.finishGame(0);

            await expect(bidGame.finishGame(0))
            .to.revertedWith("The game is finished already")
        })

        it("Should revert error message because of the game time is not finished", async function() {
            const gameFinishedIncrement: number = 600;
            const threeBidAmount: BigNumber = utils.parseUnits("0.15", 18);  // amount of three bids
            
            await bidGame.createGame(12, { value: bidAmount });

            await network.provider.send("evm_increaseTime", [timeIncrement]);
            await network.provider.send("evm_mine");

            const randomNumber: number = await bidGame.callStatic.generateRandom();

            await bidGame.connect(Alice).joinGame(0, randomNumber, { value: bidAmount });
            await bidGame.connect(Mike).joinGame(0, 8, { value: bidAmount });

            await expect(bidGame.finishGame(0))
            .to.revertedWith("You can finish a game only after exact period")
        })

        it("Should revert error message because of only participant can finish the game", async function() {
            const gameFinishedIncrement: number = 600;
            
            await bidGame.createGame(12, { value: bidAmount });

            await network.provider.send("evm_increaseTime", [timeIncrement]);
            await network.provider.send("evm_mine");

            const randomNumber: number = await bidGame.callStatic.generateRandom();

            await bidGame.connect(Alice).joinGame(0, randomNumber, { value: bidAmount });
            await bidGame.connect(Mike).joinGame(0, 8, { value: bidAmount });

            await network.provider.send("evm_increaseTime", [gameFinishedIncrement]);
            await network.provider.send("evm_mine");

            await expect(bidGame.connect(Tony).finishGame(0))
            .to.revertedWith("Only participants can finish a game")
        })
    })

    describe("Get actual games view function", function() {

        it("Should return array of actual games", async function() {
            await bidGame.createGame(12, { value: bidAmount });
            await bidGame.createGame(5, { value: bidAmount });
            
            const actualGamesArray: BigNumber[] = await bidGame.getActualGames();

            expect(actualGamesArray[0]).to.be.equal(bidAmount);
        })
    })

    describe("Get user games view funciton", function() {

        it("Should return array of user games", async function() {
            await bidGame.createGame(12, { value: bidAmount });
            
            const userGamesArray: BigNumber[] = await bidGame.getUserGames(Bob.address);
            
            expect(userGamesArray[0]).to.be.equal(bidAmount);
        })

        it("Should return 0 status of game (game in progress)", async function() {
            await bidGame.createGame(12, { value: bidAmount });
            
            const userGamesArray: BigNumber[] = await bidGame.getUserGames(Bob.address);
            
            expect(userGamesArray[3]).to.be.equal(0);
        })

        it("Should return 1 status of game (game is finished)", async function() {
            const gameFinishedIncrement: number = 600;
            
            await bidGame.createGame(12, { value: bidAmount });

            await network.provider.send("evm_increaseTime", [timeIncrement]);
            await network.provider.send("evm_mine");

            const randomNumber: number = await bidGame.callStatic.generateRandom();

            await bidGame.connect(Alice).joinGame(0, randomNumber, { value: bidAmount });
            await bidGame.connect(Mike).joinGame(0, 8, { value: bidAmount });

            await network.provider.send("evm_increaseTime", [gameFinishedIncrement]);
            await network.provider.send("evm_mine");

            await bidGame.finishGame(0);

            const userGamesArray: BigNumber[] = await bidGame.getUserGames(Alice.address);


            expect(userGamesArray[3]).to.be.equal(1);
        })

        it("Should return 2 status of the game (game is ready for finish)", async function() {
            const gameFinishedIncrement: number = 600;
            
            await bidGame.createGame(12, { value: bidAmount });

            await network.provider.send("evm_increaseTime", [timeIncrement]);
            await network.provider.send("evm_mine");

            const randomNumber: number = await bidGame.callStatic.generateRandom();

            await bidGame.connect(Alice).joinGame(0, randomNumber, { value: bidAmount });
            await bidGame.connect(Mike).joinGame(0, 8, { value: bidAmount });

            await network.provider.send("evm_increaseTime", [gameFinishedIncrement]);
            await network.provider.send("evm_mine");

            const userGamesArray: BigNumber[] = await bidGame.getUserGames(Alice.address);


            expect(userGamesArray[3]).to.be.equal(2);
        })

        it("Should return 0 status of the game (game is finished, prize is claimed)", async function() {
            const gameFinishedIncrement: number = 600;
            
            await bidGame.createGame(12, { value: bidAmount });

            await network.provider.send("evm_increaseTime", [timeIncrement]);
            await network.provider.send("evm_mine");

            const randomNumber: number = await bidGame.callStatic.generateRandom();

            await bidGame.connect(Alice).joinGame(0, randomNumber, { value: bidAmount });
            await bidGame.connect(Mike).joinGame(0, 8, { value: bidAmount });

            await network.provider.send("evm_increaseTime", [gameFinishedIncrement]);
            await network.provider.send("evm_mine");

            await bidGame.finishGame(0);

            await bidGame.connect(Alice).claim(0);

            const userGamesArray: BigNumber[] = await bidGame.getUserGames(Alice.address);


            expect(userGamesArray[3]).to.be.equal(0);
        })
    })

    describe("Claim function", function() {

        it("Should transfer money to winner of the game", async function() {
            const gameFinishedIncrement: number = 600;
            const threeBidAmount: BigNumber = utils.parseUnits("0.15", 18);  // amount of three bids
            
            await bidGame.createGame(12, { value: bidAmount });

            await network.provider.send("evm_increaseTime", [timeIncrement]);
            await network.provider.send("evm_mine");

            const randomNumber: number = await bidGame.callStatic.generateRandom();

            await bidGame.connect(Alice).joinGame(0, randomNumber, { value: bidAmount });
            await bidGame.connect(Mike).joinGame(0, 8, { value: bidAmount });

            await network.provider.send("evm_increaseTime", [gameFinishedIncrement]);
            await network.provider.send("evm_mine");

            await bidGame.finishGame(0);

            expect(() => bidGame.connect(Alice).claim(0))
            .to.changeEtherBalance(Alice, threeBidAmount)
        })

        it("Should revert with error message because of user is not the winner of the game", async function() {
            const gameFinishedIncrement: number = 600;
            const threeBidAmount: BigNumber = utils.parseUnits("0.15", 18);  // amount of three bids
            
            await bidGame.createGame(12, { value: bidAmount });

            await network.provider.send("evm_increaseTime", [timeIncrement]);
            await network.provider.send("evm_mine");

            const randomNumber: number = await bidGame.callStatic.generateRandom();

            await bidGame.connect(Alice).joinGame(0, randomNumber, { value: bidAmount });
            await bidGame.connect(Mike).joinGame(0, 8, { value: bidAmount });

            await network.provider.send("evm_increaseTime", [gameFinishedIncrement]);
            await network.provider.send("evm_mine");

            await bidGame.finishGame(0);

            await bidGame.connect(Alice).claim(0);

            await expect(bidGame.connect(Bob).claim(0))
            .to.revertedWith("You are not a winner of the game")
        })

        it("Should revert with error message because of double claim attempt", async function() {
            const gameFinishedIncrement: number = 600;
            const threeBidAmount: BigNumber = utils.parseUnits("0.15", 18);  // amount of three bids
            
            await bidGame.createGame(12, { value: bidAmount });

            await network.provider.send("evm_increaseTime", [timeIncrement]);
            await network.provider.send("evm_mine");

            const randomNumber: number = await bidGame.callStatic.generateRandom();

            await bidGame.connect(Alice).joinGame(0, randomNumber, { value: bidAmount });
            await bidGame.connect(Mike).joinGame(0, 8, { value: bidAmount });

            await network.provider.send("evm_increaseTime", [gameFinishedIncrement]);
            await network.provider.send("evm_mine");

            await bidGame.finishGame(0);

            await bidGame.connect(Alice).claim(0);

            await expect(bidGame.connect(Alice).claim(0))
            .to.be.revertedWith("Prize is claimed already")
        })
    })
})