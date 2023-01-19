import hre from "hardhat";

async function main() {
  const adminWallet = "0x0158b53A230C5bC6FE575E2c3Cd18bd198180b7b";
  const NikoToken = await hre.ethers.getContractFactory("NikoToken");
  const nikoToken = await NikoToken.deploy(adminWallet);

  console.log("Deploying token...");
  await nikoToken.deployed();
  console.log(`Niko Token deployed at ${nikoToken.address}`);
  console.log("Verifying contract address, wait 20 seconds...");

  await sleep(20 * 1000);

  console.log("Requesting verification...");
  await hre.run("verify:verify", {
    address: nikoToken.address,
    constructorArguments: [adminWallet],
    contract: "contracts/NKO.sol:NikoToken",
  });
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
