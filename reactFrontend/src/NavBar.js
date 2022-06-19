import React from 'react';
import { Box, Button, Flex } from '@chakra-ui/react';

const NavBar = ({ accounts, setAccounts}) => {
const isConnected = Boolean(accounts[0]);

    async function connectAccount () {
        if (window.ethereum) {
            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts",
            })
            setAccounts(accounts);
        }
    }

    return(
        <Flex justify = "end" align = "right" padding = "30px">
                {isConnected ? (
                    <Box margin = "0 15px">Connected</Box>
                ) : (
                    <Button fontFamily = "inherit" cursor = "pointer" onClick={connectAccount}>Connect</Button>
                )} 
        </Flex>
    )
};

export default NavBar;