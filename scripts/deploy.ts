import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  const BidGame = await ethers.getContractFactory("BidGame", signer);
  const bidGame = await BidGame.deploy();

  await bidGame.deployed();

  console.log("BidGame contract deployed to:", bidGame.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
