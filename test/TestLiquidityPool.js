const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");

const ZERO = ethers.parseEther("0");
const FIVE = ethers.parseEther("5");
const TEN = ethers.parseEther("10");
const initialTokens = ethers.parseEther("100");

describe("Liquidity Pool", function () {
  async function poolConfiguration () {
    const [owner, supplier1] = await ethers.getSigners();

    const bat = await ethers.deployContract("Token", ["BAT Token", "BAT"]); 
    const dai = await ethers.deployContract("Token", ["DAI Token", "DAI"]);

    const liquidityPool = await ethers.deployContract("LiquidityPool");

    await expect(liquidityPool.initPool(bat, dai))
      .not.to.be.reverted;

    await bat.transfer(supplier1.address, initialTokens);
    await dai.transfer(supplier1.address, initialTokens);
    
    await bat.connect(supplier1).approve(liquidityPool, initialTokens);
    await dai.connect(supplier1).approve(liquidityPool, initialTokens);

    await bat.connect(supplier1).transfer(liquidityPool, TEN);
    await dai.connect(supplier1).transfer(liquidityPool, FIVE);

    return { liquidityPool, bat,  dai, owner, supplier1};
  }

  describe("Test Liquidity Pool contract", function () {
    it("Should allow to add liquidity", async () => {
      const { liquidityPool, bat, dai, supplier1} = await loadFixture(poolConfiguration);

      expect(await liquidityPool.connect(supplier1).addLiquidity(supplier1.address))
        .not.to.be.reverted;
    });

    it("Should be initialized after deployment", async () => {
      const { liquidityPool, bat, dai, supplier1} = await loadFixture(poolConfiguration);
      
      await expect(liquidityPool.initPool(bat, dai))
          .to.be.revertedWith("initialization not allowed!");
    });

    it("Should be able to swap tokens", async () => {
      const { liquidityPool, bat, dai, supplier1} = await loadFixture(poolConfiguration);

      const batInitialBalance = await bat.balanceOf(supplier1.address);

      await expect(liquidityPool.connect(supplier1).addLiquidity(supplier1.address))
        .not.to.be.reverted;

      // tokenOut = ( reserves1 * tokenIn) / (reserves0 + tokensIn )
      const tokensOut = await liquidityPool.getTokensOutAmount(bat, FIVE);

      await bat.connect(supplier1).transfer(liquidityPool, FIVE);
                   
      await expect(
        liquidityPool.connect(supplier1).swap(tokensOut, supplier1.address, bat)
      ).to.changeTokenBalances(dai, [supplier1], [tokensOut]);

      const batNewBalance = (await bat.balanceOf(supplier1.address));
      expect(batNewBalance).to.be.equal(batInitialBalance - FIVE);

      const shares = await liquidityPool.balanceOf(supplier1.address);
      const _totalSupply = await liquidityPool.totalSupply();

      expect(_totalSupply).to.be.equal(shares);
    });

    it("Should be able to remove all liquidity", async () => {
        const { liquidityPool, bat, dai, supplier1, owner} = await loadFixture(poolConfiguration);
        
        expect(await liquidityPool.connect(supplier1).addLiquidity(supplier1.address))
          .not.to.be.reverted;

        const shares = await liquidityPool.balanceOf(supplier1.address);

        await liquidityPool.connect(supplier1).approve(owner, shares);

        await liquidityPool.transferFrom(supplier1.address, liquidityPool, shares);

        await liquidityPool.connect(supplier1).removeLiquidity(supplier1.address);

        const _shares = await liquidityPool.balanceOf(supplier1.address);

        const _totalSupply = await liquidityPool.totalSupply();

        expect(_shares).to.be.equal(ZERO);
        expect(_totalSupply).to.be.equal(ZERO);
      });
    
  });

});
