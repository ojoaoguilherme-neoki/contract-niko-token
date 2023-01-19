import hre from "hardhat";
import { FOUNDATION_WALLET, NIKO_TOKEN_ADDRESS } from "./constant/Contracts";

async function main() {
  const NeokiNFTs = await hre.ethers.getContractFactory("NeokiNFTs");
  const neokiNfts = await NeokiNFTs.deploy(
    NIKO_TOKEN_ADDRESS,
    FOUNDATION_WALLET
  );

  console.log("Deploying Neoki NFTs, wait for contract address...");
  await neokiNfts.deployed();
  console.log(`Neoki NFTs deployed at ${neokiNfts.address}`);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
