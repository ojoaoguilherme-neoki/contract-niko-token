import hre from "hardhat";
import { FOUNDATION_WALLET, NIKO_TOKEN_ADDRESS } from "./constant/Contracts";

async function main() {
  const NeokiLANDs = await hre.ethers.getContractFactory("NeokiLands");
  const lands = await NeokiLANDs.deploy(NIKO_TOKEN_ADDRESS, FOUNDATION_WALLET);

  console.log("Deploying LANDs...");
  await lands.deployed();
  console.log(`LANDs deployed at ${lands.address}`);
  // console.log("Verifying contract address, wait 20 seconds...");

  // await sleep(20 * 1000);

  // console.log("Requesting verification...");
  // await hre.run("verify:verify", {
  //   address: nikoToken.address,
  //   constructorArguments: [],
  //   contract: "contracts/Nikotoken.sol:NikoToken",
  // });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
