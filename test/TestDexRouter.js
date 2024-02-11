const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

const ZERO = ethers.parseEther("0");
const TEN = ethers.parseEther("10");
const FIFTY = ethers.parseEther("50");
const ONEHUNDRED = ethers.parseEther("100");
const initialTokens = ethers.parseEther("1000000");

describe("Liquidity Pool Factory", function () {
  async function poolConfiguration () {
    const [owner, supplier1, trader1] = await ethers.getSigners();

    const bat = await ethers.deployContract("Token", ["BAT Token", "BAT"]); 
    const dai = await ethers.deployContract("Token", ["DAI Token", "DAI"]);

    const liquidityPoolFactory = await ethers.deployContract("LiquidityPoolFactory");
    const dexPoolRouter = await ethers.deployContract("DexPoolRouter", [liquidityPoolFactory]);

    await bat.transfer(supplier1.address, initialTokens);
    await dai.transfer(supplier1.address, initialTokens);
    
    await bat.connect(supplier1).approve(dexPoolRouter, initialTokens);
    await dai.connect(supplier1).approve(dexPoolRouter, initialTokens);

    await bat.transfer(trader1.address, initialTokens);
    await dai.transfer(trader1.address, initialTokens);
    
    await bat.connect(trader1).approve(dexPoolRouter, initialTokens);
    await dai.connect(trader1).approve(dexPoolRouter, initialTokens);

    await expect(liquidityPoolFactory.createPair(bat, dai))
       .not.to.be.reverted;

    const poolAddress = await liquidityPoolFactory.getPairAddress(bat, dai);

    await expect (dexPoolRouter.connect(supplier1)
          .addTokenToTokenLiquidity(bat, dai, FIFTY, ONEHUNDRED))
          .not.to.be.reverted;

    return { dexPoolRouter, bat,  dai, owner, supplier1, trader1, poolAddress};
  }

  describe("Test Liquidity Pool Factory contract", ()  => {
    it("Should initialize the liquidity pool", async () => {
      const { dexPoolRouter, bat,  dai, owner, supplier1, poolAddress } = await loadFixture(poolConfiguration);

      const liquidityPool = await ethers.getContractAt("LiquidityPool", poolAddress);
      expect(await liquidityPool.initialized()).to.be.equal(true);

      const _shares = await liquidityPool.balanceOf(supplier1.address);
      const _totalSupply = await liquidityPool.totalSupply();
      expect(_totalSupply).to.be.equal(_shares)
        
      // Verify reserves.
      const [reserve0, reserve1, ] = await liquidityPool.getLatestReserves();

      expect(reserve0).to.be.equal(FIFTY);
      expect(reserve1).to.be.equal(ONEHUNDRED);
    });

    it("Should allow to swap Tokens", async () => {
      const { dexPoolRouter, bat,  dai, owner, supplier1, trader1, poolAddress } = await loadFixture(poolConfiguration);

      const minAmountOut = await dexPoolRouter.getTokenAmountOut(bat, dai, TEN);

      await expect(
        dexPoolRouter.connect(trader1).swapTokenToToken(bat, dai, TEN)
      ).to.changeTokenBalances(dai, [trader1], [minAmountOut]);
    });

    it("Should allow to swap Tokens in opposite direction", async () => {
      const { dexPoolRouter, bat,  dai, owner, supplier1, trader1, poolAddress } = await loadFixture(poolConfiguration);

      const minAmountOut = await dexPoolRouter.getTokenAmountOut(dai, bat, TEN);

      await expect(
        dexPoolRouter.connect(trader1).swapTokenToToken(dai, bat, TEN)
      ).to.changeTokenBalances(bat, [trader1], [minAmountOut]);
    });

    it("Should emit an event when calling dex Pool Router contract ", async () => {
        const { dexPoolRouter, bat,  dai, owner, supplier1, trader1, poolAddress } = await loadFixture(poolConfiguration);

        const minAmountOut = await dexPoolRouter.getTokenAmountOut(dai, bat, TEN);

        await expect(
            dexPoolRouter.connect(trader1).swapTokenToToken(bat, dai, TEN)
          )
          .to.emit(dexPoolRouter, "LogSwapTokenToToken")
          .withArgs(
              trader1.address, 
              bat.target,
              dai.target,
              poolAddress,
              TEN
          );
      });

      it("Should be able to remove all liquidity", async () => {
        const { dexPoolRouter, bat,  dai, owner, supplier1, trader1, poolAddress } = await loadFixture(poolConfiguration);
        
        const liquidityPool = await ethers.getContractAt("LiquidityPool", poolAddress);

        const shares = await liquidityPool.balanceOf(supplier1);

        await liquidityPool.connect(supplier1).approve(dexPoolRouter, shares);

        await expect( 
          dexPoolRouter.connect(supplier1).removeLiquidity(bat, dai, shares, supplier1)
        ).not.to.be.reverted;

        const newShares = await liquidityPool.balanceOf(supplier1.address);

        const _totalSupply = await liquidityPool.totalSupply();

        expect(newShares).to.be.equal(ZERO);
        expect(_totalSupply).to.be.equal(ZERO);
      });

      it("Should allow to update the owner fees", async () => {
        const { dexPoolRouter, bat,  dai, owner, supplier1, trader1, poolAddress } = await loadFixture(poolConfiguration);

        const ownerFees = await dexPoolRouter.ownerFees();
        const factor = await dexPoolRouter.factor();
        
        const feesAmount = (TEN * ownerFees) / factor;

        await expect(
            dexPoolRouter.connect(trader1).swapTokenToToken(bat, dai, TEN)
        ).to.changeTokenBalances(bat, [owner], [feesAmount]);
      });
  });
});
