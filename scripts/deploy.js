const hre = require("hardhat");
const { ethers } = require("ethers");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const defaultVerifierPubKeyHash = ethers.keccak256(ethers.toUtf8Bytes(deployer.address));

  const CivicGuard = await hre.ethers.getContractFactory("CivicGuard");
  const contract = await CivicGuard.deploy(defaultVerifierPubKeyHash);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log("CivicGuard deployed to:", address);
  console.log("Default verifier (deployer):", deployer.address);
  console.log("\nAdd to .env.local:");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`);
  console.log(`NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
