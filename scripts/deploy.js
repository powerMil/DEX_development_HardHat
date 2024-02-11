// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const hre = require("hardhat");

async function main() {
  const FIFTY = ethers.parseEther("50");
  const ONEHUNDRED = ethers.parseEther("100");
  const initialTokens = ethers.parseEther("100000");
  const [owner] = await ethers.getSigners();

  const bat = await hre.ethers.deployContract("Token", ["xBAT Token", "xBAT"]);
  await bat.waitForDeployment();
  const batAddress = await bat.getAddress();
  
  const dai = await hre.ethers.deployContract("Token", ["xDAI Token", "xDAI"]);
  await dai.waitForDeployment();
  const daiAddress = await dai.getAddress();
  
  const liquidityPoolFactory = await hre.ethers.deployContract("LiquidityPoolFactory");
  await liquidityPoolFactory.waitForDeployment();
    
  const factoryAddress = await liquidityPoolFactory.getAddress();

  const dexPoolRouter = await hre.ethers.deployContract("DexPoolRouter", [factoryAddress]);
  await dexPoolRouter.waitForDeployment();
  const routerAddress = await dexPoolRouter.getAddress();
  
  console.log(
    `\n
     const daiAddress = "${daiAddress}"; \n` + 
    `const batAddress = "${batAddress}"; \n` +
    `const factoryAddress = "${factoryAddress}"; \n` +
    `const routerAddress = "${routerAddress}"; \n`
  );
}


// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
