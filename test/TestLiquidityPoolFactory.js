const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

const ZERO = ethers.parseEther("0");

describe("Liquidity Pool Factory", function () {
  async function poolConfiguration () {
    const [owner] = await ethers.getSigners();

    const bat = await ethers.deployContract("Token", ["BAT Token", "BAT"]); 
    const dai = await ethers.deployContract("Token", ["DAI Token", "DAI"]);
    const liquidityPoolFactory = await ethers.deployContract("LiquidityPoolFactory");

    return { liquidityPoolFactory, bat,  dai, owner};
  }

  describe("Test Liquidity Pool Factory contract", function () {

    it("Should allow to create a pair", async () => {
        const { liquidityPoolFactory, owner, bat, dai } = await loadFixture(poolConfiguration);

        expect(await liquidityPoolFactory.allPairsLength()).to.be.equal(ZERO);

        expect(await liquidityPoolFactory.pairExists(bat, dai)).to.be.equal(false);

        await expect(liquidityPoolFactory.createPair(bat, dai))
          .not.to.be.reverted;

        expect(await liquidityPoolFactory.allPairsLength()).to.be.equal(1);

        expect(await liquidityPoolFactory.pairExists(bat, dai)).to.be.equal(true);
        expect(await liquidityPoolFactory.pairExists(dai, bat)).to.be.equal(true);

        const poolAddress = await liquidityPoolFactory.getPairAddress(bat, dai);

        const liquidityPool = await ethers.getContractAt("LiquidityPool", poolAddress);
        expect(await liquidityPool.initialized()).to.be.equal(true);
        expect(await liquidityPool.owner()).to.be.equal(owner.address);
    });

    it("Should emit an event", async () => {
        const { liquidityPoolFactory, owner, bat, dai } = await loadFixture(poolConfiguration);
        
        await expect(liquidityPoolFactory.createPair(bat, dai))
          .to.emit(liquidityPoolFactory, "LogCreateLiquidityPool")
          .withArgs(
            bat.target, dai.target, owner.address, 1
          );
    });
  });

});
