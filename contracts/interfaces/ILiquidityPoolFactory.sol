// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface ILiquidityPoolFactory {
    event PairCreated(address indexed token0, address indexed token1, address pair, uint);

    function owner() external view returns (address);
    function getPairAddress(address tokenA, address tokenB) external view returns (address pair);
    function allPairs(uint) external view returns (address pair);
    function allPairsLength() external view returns (uint);
    function createPair(address tokenA, address tokenB, uint fees) external returns (address pair);
}