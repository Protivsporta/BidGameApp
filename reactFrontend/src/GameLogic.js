import React from 'react';
import { useState } from 'react';
import { ethers, BigNumber } from 'ethers';
import BidGame from './BidGame.json';
import { Box, Button, Flex, Tab, TabList, TabPanels, Tabs, TabPanel, Container, Input, SimpleGrid } from '@chakra-ui/react';

const BidGameAddress = '0x9f540B095EeAB690C356A40178CA597272018F0c';

const provider = new ethers.providers.Web3Provider(window.ethereum);
const signer = provider.getSigner();
const contract = new ethers.Contract(BidGameAddress, BidGame.abi, signer);

let actualGamesList = [];
let pastGamesList = [];

let repeater1 = [];
let repeater2 = [];

getActualGamesArray();

getPastGamesArray();

async function getActualGamesArray() {
    let actualGamesArray = await contract.getActualGames();
    const chunkSize = 4;
    for(let i = 0; i < actualGamesArray.length; i += chunkSize) {
        const chunk = actualGamesArray.slice(i, i + chunkSize);
        if (Number(chunk[1]) !== 0) {
            actualGamesList.push(chunk);
        }
    }
    repeater1 = actualGamesList.map(i => {
        return(
            <Box bg = 'lightgray' height='50px' width = '600px' key = {i} borderRadius = '4px'>
                <Flex justify = 'space-around'>
                    <Flex className = 'insideBox'>Bid: {ethers.utils.formatEther(i[0])} Eth</Flex>
                    <Flex className = 'insideBox'>Participants: {Number(i[2])}</Flex>
                    <Button margin = '5px' onClick = {() => handleJoin(i[3], i[0])}>Join</Button>
                    <Input height = '50px' type = 'number' placeholder = 'Your number' size = 'md' id = 'numberInput'></Input>
                </Flex>                
            </Box>
        )
    })
}

async function getPastGamesArray() {
    const signerAddress = await signer.getAddress();
    let userGamesArray = await contract.getUserGames(signerAddress);
    const chunkSize = 5;
    for(let i = 0; i < userGamesArray.length; i += chunkSize) {
        const chunk = userGamesArray.slice(i, i + chunkSize);
        pastGamesList.push(chunk);
    }
    repeater2 = pastGamesList.map(i => {
        return(
            <Box bg = 'lightgray' height='50px' width = '600px' key = {i} borderRadius = '4px'>
                <Flex justify = 'space-around'>
                    <Flex className = 'insideBox'>Bid: {ethers.utils.formatEther(i[0])} Eth</Flex>
                    <Flex className = 'insideBox'>Participants: {Number(i[2])}</Flex>
                    {Number(i[3]) === 1 &&
                        <Button margin = '5px' onClick = {() => handleClaim(i[4])}>Claim</Button>    
                    }
                    {Number(i[3]) === 2 &&
                        <Button margin = '5px' onClick = {() => handleFinish(i[4])}>Finish</Button>    
                    }                    
                </Flex>                
            </Box>
        )
    })
}

async function handleJoin(_gameId, _bidInEth) {
    if (window.ethereum) {
        const userNumber = document.getElementById('numberInput').value;
        try{
            const response = await contract.joinGame(BigNumber.from(_gameId), BigNumber.from(Number(userNumber)), { value: _bidInEth});
            console.log("response: ", response)
        } catch(err) {
            console.log("error: ", err)
        }
    }
}

async function handleFinish(_gameId) {
    if (window.ethereum) {
        try{
            const response = await contract.finishGame(BigNumber.from(_gameId));
            console.log("response: ", response)
        } catch(err) {
            console.log("error: ", err)
        }
    }
}

async function handleClaim(_gameId) {
    if (window.ethereum) {
        try{
            const response = await contract.claim(BigNumber.from(_gameId));
            console.log("response: ", response)
        } catch(err) {
            console.log("error: ", err)
        }
    }
}

const GameLogic = ({ accounts, setAccounts }) => {

    const [numberBid, setNumberBid] = useState();
    const [bidInEth, setBidInEth] = useState();

    async function handleCreate() {
        if (window.ethereum) {
            try{
                const response = await contract.createGame(BigNumber.from(numberBid), { value: ethers.utils.parseEther((bidInEth).toString())});
                console.log("response: ", response);
            } catch(err) {
                console.log("error: ", err)
            }
        }
    }

    return(
        <Flex justify = 'center'>
            <Tabs variant = "unstyled" align='center'>
                <TabList>
                    <Tab _selected={{ bg: 'white', fontWeight: 'bold' }}>Game</Tab>
                    <Tab _selected={{ bg: 'white', fontWeight: 'bold' }}>Passed Games</Tab>
                </TabList>
            <TabPanels>
                <TabPanel>
                    <Container marginTop = '35px'>
                        <p>Start new game</p>
                        <Input type = 'number' placeholder = 'Your number' size = 'md' value = {numberBid} onChange={event => setNumberBid(event.target.value)}></Input>
                        <Input type = 'number' placeholder = 'Your bid in Eth' size = 'md' value = {bidInEth} onChange={event => setBidInEth(event.target.value)}></Input>
                        <Button margin = '5px' onClick = {handleCreate}>Play</Button>
                    </Container>
                    <Container marginTop = '35px'>
                        <p>Current Games</p>
                        <SimpleGrid columns = '1' spacing = '10'>
                            {repeater1}
                        </SimpleGrid>
                    </Container>
                </TabPanel>
                <TabPanel>
                    <Container marginTop = '35px'>
                        <p>Past Games</p>
                        <SimpleGrid columns = '1' spacing = '10'>
                            {repeater2}
                        </SimpleGrid>
                    </Container>
                </TabPanel>
            </TabPanels>
            </Tabs>
        </Flex>
    )

}

export default GameLogic;
