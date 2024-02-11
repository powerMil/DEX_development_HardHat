// We frequire the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");
const { expect } = require("chai");

async function main() {
  const FIFTY = ethers.parseEther("50");
  const ONEHUNDRED = ethers.parseEther("100");
  const initialTokens = ethers.parseEther("100000");
  const [owner] = await ethers.getSigners();

  const daiAddress = "0x6DA02b0672b84D1209990c2AFDE5FE67c0076116"; 
  const batAddress = "0x0D6C8A63090cF3b04dD4621BDbe9Be0834a27E98"; 
  const factoryAddress = "0xFa7CCeA48b98777b35E26FD1Ba42e8b91A986780"; 
  const routerAddress = "0x3c93bbA21a8dCbb70b0542bE7992537f27acEa75";

  const dai = await hre.ethers.getContractAt("Token", daiAddress);
  const bat = await hre.ethers.getContractAt("Token", batAddress);
  const router = await hre.ethers.getContractAt("DexPoolRouter", routerAddress);
  const factory = await hre.ethers.getContractAt("LiquidityPoolFactory", factoryAddress);

  await bat.approve(routerAddress, initialTokens);
  await dai.approve(routerAddress, initialTokens);

  console.log("Tokens approved");

  let tx = await factory.createPair(batAddress, daiAddress);
  await tx.wait(1);
  
  const pairs = await factory.allPairsLength();
  console.log("Pairs: ", pairs);
    
  const poolAddress = await factory.getPairAddress(batAddress, daiAddress);
  console.log("Pool: ", poolAddress);

  tx = await router.addTokenToTokenLiquidity(batAddress, daiAddress, FIFTY, ONEHUNDRED);
  await tx.wait(1);

  const pool = await hre.ethers.getContractAt("LiquidityPool", poolAddress);

  console.log("Total shares: ", await pool.totalSupply());

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
