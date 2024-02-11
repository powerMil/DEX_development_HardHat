// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/ILiquidityPoolFactory.sol";
import "./interfaces/ILiquidityPool.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";


contract DexPoolRouter is Ownable {

    ILiquidityPoolFactory public poolFactory;
    uint public constant factor = 10000;
    uint public ownerFees = 20; //.2%

    event LogAddTokenToTokenLiquidity(
        address _sender, 
        address _tokenA, 
        address _tokenB, 
        uint amountA, 
        uint amountB, 
        address poolAddress
    );

    event LogSwapTokenToToken(
        address _sender, 
        address _tokenIn, 
        address _tokenOut, 
        address _poolAddress,
        uint _amountIn
    );

    event LogRemoveLiquidity(
        address _sender, 
        address _tokenA, 
        address _tokenB, 
        uint _shares, 
        uint _amountA, 
        uint _amountB, 
        address poolAddress
    );

    constructor(address _poolFactory) {
        poolFactory = ILiquidityPoolFactory(_poolFactory);
    }

    function swapTokenToToken(
        address _tokenIn, 
        address _tokenOut, 
        uint _amountIn
    )
        external
    {
        address to = msg.sender;
        require(_tokenIn != _tokenOut, "tokens should be different!");
        require(_tokenIn != address(0) && _tokenOut != address(0), "tokens should not be zero!");
        require(_amountIn > 0, "amount in should not be zero");

        address poolAddress = getPairAddress(_tokenIn, _tokenOut);

        uint amountIn = transferTokens(_amountIn, _tokenIn, to, poolAddress);

        _swapTokensWithFees(poolAddress, to, _tokenIn, amountIn);
        
        emit LogSwapTokenToToken(msg.sender, _tokenIn, _tokenOut, poolAddress, _amountIn);
    }

    function _swapTokensWithFees(address _poolAddress, address _to, address _tokenIn, uint _amountIn) 
        internal
    {
        uint amountOut;

        amountOut = ILiquidityPool(_poolAddress).getTokensOutAmount(_tokenIn, _amountIn);
        ILiquidityPool(_poolAddress).swap(amountOut, _to, _tokenIn);
    }

    function sortTokens(address tokenA, address tokenB) 
        internal 
        pure 
        returns (address token0, address token1) 
    {
        require(tokenA != tokenB, 'tokens should be different!');
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), 'zero address not allowed!');
    }

    function addTokenToTokenLiquidity(
        address _tokenA,
        address _tokenB,
        uint _amountADesired,
        uint _amountBDesired
    ) 
        external
        returns(uint shares)
    {
        require(_tokenA != _tokenB, "tokens should be different!");
        require(_tokenA != address(0) && _tokenB != address(0), "token address should not be zero!");

        require(_amountADesired > 0, "TokenA amount is zero!");
        require(_amountBDesired > 0, "TokenB amount is zero!");

        address poolAddress = getPairAddress(_tokenA, _tokenB);
        require(poolAddress != address(0), "Token pool does not exist!");
        
        IERC20(_tokenA).transferFrom(msg.sender, poolAddress, _amountADesired);
        IERC20(_tokenB).transferFrom(msg.sender, poolAddress, _amountBDesired);

        shares = ILiquidityPool(poolAddress).addLiquidity(msg.sender);

        emit LogAddTokenToTokenLiquidity(msg.sender, _tokenA, _tokenB, _amountADesired, _amountBDesired, poolAddress);
    }

    function removeLiquidity(
        address _tokenA,
        address _tokenB,
        uint _shares,
        address _to
        ) 
            public 
            returns (uint amountA, uint amountB) 
    {

        address poolAddress = getPairAddress(_tokenA, _tokenB);
        require(poolAddress != address(0), "Token pool does not exist!");

        bool status = ILiquidityPool(poolAddress).transferFrom(msg.sender, poolAddress, _shares);
        require(status, "transfer failed!");

        (uint amount0, uint amount1) = ILiquidityPool(poolAddress).removeLiquidity(_to);

        (address token0, address token1) = sortTokens(_tokenA, _tokenB);

        (amountA, amountB) = _tokenA == token0 ? (amount0, amount1) : (amount1, amount0);

        emit LogRemoveLiquidity(msg.sender, token0, token1, _shares, amountA, amountB, poolAddress);
    }

    function getTokenPairRatio(address _tokenA, address _tokenB, uint _amountIn)
        public
        view
        returns (uint amountOut)
    {
        address poolAddress = getPairAddress(_tokenA, _tokenB);
        (,, uint reserveIn, uint reserveOut) = ILiquidityPool(poolAddress).getReserves(_tokenA);
        
        amountOut = reserveIn == 0 ? 0 : (reserveOut * _amountIn) / reserveIn;
    }

    function getTokenPairReserves(address _token0, address _token1)
        external
        view
        returns(uint amount0, uint amount1)
    {
        address poolAddress = getPairAddress(_token0, _token1);
        require(poolAddress != address(0), "pool does not exist!");

        (amount0, amount1, ) = ILiquidityPool(poolAddress).getLatestReserves();
    }

    function getPairAddress(address _tokenA, address _tokenB)
        internal
        view
        returns(address poolAddress)
    {
        (address token0, address token1) = sortTokens(_tokenA, _tokenB);
        poolAddress = ILiquidityPoolFactory(poolFactory).getPairAddress(token0, token1);
        require(poolAddress != address(0), "pool does not exist!");
    }

    function getAmountIn(uint _amountIn)
        view
        internal 
        returns(uint _ownerFees, uint amountIn) 
    {
        _ownerFees = (_amountIn * ownerFees)/factor;
        amountIn = _amountIn - _ownerFees;
    }

    function transferTokens(uint _amountIn, address _tokenIn, address _to, address _poolAddress) 
        internal 
        returns (uint amountIn) 
    {
        uint _ownerFees;
        (_ownerFees, amountIn) = getAmountIn(_amountIn);

        IERC20(_tokenIn).transferFrom(_to, owner(), _ownerFees);
        IERC20(_tokenIn).transferFrom(_to, _poolAddress, amountIn);
    }

    function getTokenAmountOut(address _tokenIn, address _tokenOut, uint _amountIn) 
        external
        view
        returns (uint amountOut)
    {
        address poolAddress = getPairAddress(_tokenIn, _tokenOut);
        require(poolAddress != address(0), "pool does not exist!");

        uint amountIn;
        (, amountIn) = getAmountIn(_amountIn);

        amountOut = ILiquidityPool(poolAddress).getTokensOutAmount(_tokenIn, amountIn);
    }

}